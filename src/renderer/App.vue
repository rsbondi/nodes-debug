<template>
  <div id="app" :okToLoad="console">
    <div v-bind:class="[{ 'led-green' : online && controllerOnline}, {'led-red': !online || !controllerOnline}]"
      style="position: absolute; right: 10px; top:10px" class="led"></div>
    <el-tabs class="node-tabs" v-model="activeNodeIndex" 
             @tab-click="handleNode" 
             @tab-remove="removeNode" 
             editable @edit="handleNewNode">
      <el-tab-pane v-for="node in nodes" 
          :disabled="nodes.length == 1"
          :key="node.index" 
          :label="node.name" 
          :name="node.index"
          
          ></el-tab-pane>
    </el-tabs>

    <el-tabs type="card" v-model="activePage" @tab-click="handlePage" v-loading="$store.state.Nodes.loading">
      <el-tab-pane label="Information" name="info"><info-view></info-view></el-tab-pane>
      <el-tab-pane label="Console" name="console"><console-view :page="activePage"></console-view></el-tab-pane>
      <!-- <el-tab-pane label="Network" name="network"></el-tab-pane> -->
      <el-tab-pane label="Peers" name="peers"><peers-view></peers-view></el-tab-pane>
    </el-tabs>

    <el-dialog :title="nodeEditMode+' Node'" :visible.sync="dialogVisible">
      <el-form ref="form" :model="formnode" label-width="120px">
        <el-form-item label="Node Type">
          <div class="el-select">
          <select v-model="formnode.type" class="el-input__inner" placeholder="Select">
            <option class="el-input__inner"
              v-for="node in nodeTypes"
              :key="node.index"
              :label="node.name"
              :value="node.index">{{ node.name }}
            </option>
          </select>
          </div>
        </el-form-item>
        <el-form-item label="Name">
            <el-input v-model="formnode.name"></el-input>
          </el-form-item>
        <el-form-item label="Host">
          <el-input v-model="formnode.host"></el-input>
        </el-form-item>
        <el-form-item label="Port">
          <el-input v-model="formnode.port"></el-input>
        </el-form-item>
        <el-form-item label="Config">
          <el-input v-model="formnode.config"></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">Cancel</el-button>
        <el-button v-if="nodeEditMode=='Edit'" type="primary" @click="saveNode">Save</el-button>
        <el-button v-else type="primary" @click="addNewNode">Add</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import Vue from "vue";
const { remote } = require("electron");
const { Menu, MenuItem, dialog } = remote;
const fs = require("fs");
const path = require("path");
const os = require("os");
const requireString = require('require-from-string')
import { MenuHandler } from "./menu";
import Empty from "./components/Empty";
import InfoView from "./components/Info";
import PeersView from "./components/Peers";
import ConsoleView from "./components/Console";

let infoInterval;
import { empties } from "./misc";

function requireFromPath(dir, mod) {
  const modpath = path.join(dir,mod)
  const modString = fs.readFileSync(modpath, 'utf8')
  return requireString(modString, modpath, {appendPath: path.join(dir, 'node_modules')})
}

export default {
  name: "nodes-debug",
  components: { InfoView, PeersView, ConsoleView },
  data() {
    return {
      activeIndex: "1",
      activePage: "info",
      dialogVisible: false,
      activeNodeIndex: "",
      nodeToAdd: "",
      nodeEditMode: "",
      newnode() {
        return { name: "", type: "bitcoin", port: "", host: "", config: "" };
      },
      formnode: {},
      nodeTypes: [],
      online: navigator.onLine,
      controllerOnline: false,
      theme: 'light'
    };
  },
  computed: {
    nodes() {
      const nodes = this.$store.state.Nodes.nodes;
      return Object.keys(nodes).map(n => {
        let node = Object.assign({}, nodes[n]);
        node.index = n;
        return node;
      });
    },
    console() {
      const fileName = `${os.homedir()}/.nodes-debug/last.conf`;
    
      if(this.$store.state.Nodes.consoleReady) {

        if(process.env.NODE_ENV === 'production' && remote.process.argv.length > 1) {
          const args = remote.process.argv.reduce((o, c, i) => {
            if(i) {
              const kv = c.split('=')
              o[kv[0]] = kv[1]
            }
            return o
          }, {})
          this.getConfig(args.config, async () => {
            await this.nodeChange(this.getCurrentNode())
          });
        }
        else fs.readFile(fileName, "utf-8", (err, data) => {
          if (data) {
            this.getConfig(data, async () => {
              await this.nodeChange(this.getCurrentNode())
            });
          } else this.nodeChange(this.getCurrentNode())
        });
      }
      return this.$store.state.Nodes.consoleReady
    }
  },
  methods: {
    saveEditor(ed) {
      const savePath = dialog.showSaveDialog({});
      if (savePath) {
        fs.writeFile(savePath, ed.getValue(), err => {
          if (err) this.$message.error("savePath", err);
          else this.$message("console saved");
        });
      }
    },
    loadEditor(editor) {
      dialog.showOpenDialog(function(fileNames) {
        if (fileNames === undefined) return;
        var fileName = fileNames[0];
        fs.readFile(fileName, "utf-8", (err, data) => {
          if (err) this.$message.error("savePath", err);
          else editor.setValue(data);
        });
      });
    },
    getConfig(fileName, cb) {
      this.$message(`loading ${fileName}`)
      fs.readFile(fileName, "utf-8", (err, data) => {
        if (err) {
          this.$message.error(`invalid config file: ${fileName}`);
          return;
        }
        try {
          const config = JSON.parse(data);
          let nodes, theme
          if(Array.isArray(config)) {
            nodes = config
            theme = 'light'
          } else {
            ({nodes, theme} = config)
          }
          this.handleTheme(theme)
          this.$store.commit("node_remove_all");
          nodes.forEach(async n => {
            await this._commitNewNode({ index: n.index, node: n });
          });
          this.$message('config loaded')
          this.resetInterval()
          if (cb) cb();
        } catch (e) {
          console.log("caught", e);
          this.$message.error(e.message);
        }
      });
    },
    saveLastConfig(fileName) {
      const dir = `${os.homedir()}/.nodes-debug`;

      function writeIt() {
        fs.writeFile(`${dir}/last.conf`, fileName, err => {
          if (err) {
            console.log(err);
            this.$message.error(err);
          }
        });
      }
      fs.stat(dir, function(err, stats) {
        if (err) {
          fs.mkdir(dir, writeIt);
        } else {
          writeIt();
        }
      });
    },
    handleTheme(t) {
      const href = process.env.NODE_ENV === 'development'
                    ? `file:///${path.resolve(__dirname)}/css/theme/${t}/styles.css`
                    : `file:///${path.resolve(__dirname)}/../../src/renderer/css/theme/${t}/styles.css`
        let styleElement = document.head.querySelector('#themestyle')
        if(!styleElement) {
          styleElement = document.createElement('link')
          styleElement.rel = "stylesheet"
          styleElement.type = "text/css"
          styleElement.id = 'themestyle'
          document.head.appendChild(styleElement)
        }
        styleElement.href = href
        monaco.editor.setTheme(`vs-${t}`)
        this.theme = t
    },
    handleMenu(e) {
      switch (e) {
        case "cfg-node":
          this.nodeEditMode = "Edit";
          this.formnode = this.getCurrentNode();
          this.dialogVisible = true;
          break;
        case "cfg-save":
          var savePath = dialog.showSaveDialog({});
          if (savePath) {
            fs.writeFile(savePath, JSON.stringify({nodes: this.nodes, theme: this.theme}), err => {
              if (err) {
                this.$message.error(err);
              } else {
                this.$message("config saved!");
                this.saveLastConfig(savePath);
              }
            });
          }
          break;
        case "cfg-load":
          dialog.showOpenDialog(fileNames => {
            if (fileNames === undefined) return;
            const fileName = fileNames[0];
            this.getConfig(fileName, () => {
              this.saveLastConfig(fileName);
            });
          });
          break;
        case "result-clear":
          window.resultEditor.setValue("");
          break;
        case "result-save":
          this.saveEditor(window.resultEditor);
          break;
        case "result-load":
          this.loadEditor(window.resultEditor);
          break;
        case "cmd-save":
          this.saveEditor(window.commandEditor);
          break;
        case "cmd-load":
          this.loadEditor(window.commandEditor);
          break;
        case "cmd-exec":
          window.commandEditor.getAction("action-execute-command").run();
          break;
        case "theme-light":
          this.handleTheme('light')
          break
        case "theme-dark":
          this.handleTheme('dark')
          break
      }
    },
    handleNewNode(e) {
      if (!e) {
        this.formnode = this.newnode();
        this.nodeEditMode = "Add";
        this.dialogVisible = true;
      }
    },
    _commitNewNode(newnode) {
      return new Promise(async (resolve, reject) => {
        this.$store.commit("node_add", newnode);
        this.activeNodeIndex = newnode.index;
        this.$store.commit("node_type_changed", newnode.node.type);
        try {
          // const wtf = await this.nodeChange(newnode.index)
          // resolve()
        } catch(e) { resolve() }
        this.dialogVisible = false;
      })
    },
    addNewNode() {
      let node = Object.assign({}, this.formnode);
      const newnode = {
        index: `n${new Date().getTime().toString()}`,
        node: node
      };
      this._commitNewNode(newnode);
    },
    saveNode() {
      this.$store.commit("node_update_controller", this.formnode);
      const controller = window.controllerInstances[
        this.formnode.index
      ];
      controller.update(this.formnode);
      this.resetInterval();
      this.dialogVisible = false;
    },
    handlePage(e) {
      this.$store.commit("node_set_page", this.activePage);
      this.callService();
    },
    getCurrentNode() {
      return this.nodes.filter(n => n.index == this.activeNodeIndex)[0];
    },
    handleNode(e) {
      // tab to node
      // using watcher to preserve model states
    },
    removeNode(targetName) {
      // tab x
      let tabs = this.nodes;
      let activeNodeIndex = this.activeNodeIndex;
      if (activeNodeIndex === targetName) {
        tabs.forEach((tab, index) => {
          if (tab.index === targetName) {
            let nextTab = tabs[index + 1] || tabs[index - 1];
            if (nextTab) {
              activeNodeIndex = nextTab.index;
            }
          }
        });
      }
      this.activeNodeIndex = activeNodeIndex;
      this.$store.commit("node_remove", targetName);
      this.handleNode();
    },
    nodeChange(currentNode) {
      if(!currentNode) return
      return new Promise((resolve, reject) => {
        if (~this.$store.state.Nodes.loadedTypes.indexOf(currentNode.type)) {
          // already have type, check if model is current
          if (!~Object.keys(window.controllerInstances).indexOf(currentNode.index)) {
            const controller = new this.$store.state.Nodes.controllers[
              currentNode.type
            ](currentNode);
            this.$store.commit("node_instantiate_controller", {
              index: currentNode.index,
              type: currentNode.type,
              controller: controller
            });
          }
          if (!~this.$store.state.Nodes.registeredTypes.indexOf(currentNode.type)) {
            this.$store.commit("node_set_index", currentNode.index);
            if (!this.$store.state.Nodes.consoleReady)
              this.$store.state.Nodes.controllers[currentNode.type].register(
                window.commandEditor,
                window.resultEditor,
                this.$store
              ).then(() => {
                this.$store.commit('node_controller_type_registered', currentNode.type)
                this.nodeChange(currentNode).then(() => resolve())
              }).catch(() => this.$message.error(`unable to register controller type ${currentNode.type}`))
            return
          }
          this.$store.commit("node_set_index", currentNode.index);
          this.callService("getConsole", "console");
          this.resetInterval();
          resolve();
          return;
        }
        
        const dir = path.resolve(`${__dirname}/../../dist/build_nodetypes/${currentNode.type}`)
        let nodetypeModules;
        try {
          nodetypeModules = fs.readdirSync(dir);
        } catch (e) {
          alert(`${e} ${path.resolve(".")}`);
          return
        }
        const promises = [];

        nodetypeModules.forEach(mod => {
          if(fs.lstatSync(path.join(dir, mod)).isDirectory() || ~['package.json', 'package-lock.json'].indexOf(mod)) return
          if (mod.slice(-7) == ".vue.js") {
            promises.push(new Promise((resolve, reject) => {
              resolve(requireFromPath(dir, mod))
            }))

          } else if (mod.slice(-3) == ".js"){
            (new Promise((resolve, reject) => {
              resolve(requireFromPath(dir, mod))
            }))
              .then(c => {
                if (c.controller) {
                  this.$store.commit("node_controller_type_loaded", c);
                  const controller = new c.controller(currentNode);
                  this.$store.commit("node_set_index", currentNode.index);
                  this.$store.commit("node_instantiate_controller", {
                    index: currentNode.index,
                    type: currentNode.type,
                    controller: controller
                  });
                  if(c.controller.emitter) {
                    c.controller.emitter.once('controller-ready', this.callService)
                  }
                  else this.callService()
                }
              })
            .catch(e => {console.log(e); resolve()});
          }
        });
        Promise.all(promises)
          .then(comps => {
            comps.forEach(comp => {
              Vue.component(comp.name, comp)
            }
            );
            this.$store.commit("node_type_loaded", currentNode.type);
            resolve();
          })
          .catch(e => {console.log(e); resolve()});
      });
    },
    callService(s, p) {
      if (!this.online) return;
      const service =
        s ||
        `get${this.activePage.slice(0, 1).toUpperCase()}${this.activePage.slice(
          1
        )}`;
      const controller = window.controllerInstances[this.$store.state.Nodes.currentIndex]
      return controller[service]()
        .then(info => {
          this.controllerOnline = controller.online
          if(service != 'ping') this.$store.commit("node_set_" + (p || this.activePage), info ? info : empties[this.activePage]);
        })
        .catch(e => {
          console.log('am I ever here?', e)
          this.$store.commit(
            "node_set_" + (p || this.activePage),
            empties[this.activePage]
          );
        });
    },
    resetInterval() {
      if (infoInterval) clearInterval(infoInterval);
      infoInterval = setInterval(() => {
        this.callService(this.activePage == 'console' ? 'ping' : null);
      }, 30000);
      if(this.activePage == "console") this.callService('ping')
      else {
        this.$store.commit("node_set_loading", true);
        this.callService().then(() => {
          this.$store.commit("node_set_loading", false)
          
        });
      }
    }
  },
  watch: {
    activeNodeIndex: function(newVal, oldVal) {
      if (window.consoleStates && oldVal && this.$store.state.Nodes.consoleReady) {
        window.consoleStates[oldVal] = {
          command: window.commandEditor.saveViewState(),
          result: window.resultEditor.saveViewState()
        };
      }
      const node = this.getCurrentNode();
      if(node) {
        this.$store.commit("node_type_changed", node.type);
        this.nodeChange(node);
      }
    },
  },
  mounted() {
    const path = require("path");

    try {
      const dir = path.resolve(`${__dirname}/../../dist/build_nodetypes`)

      const nodetypes = fs.readdirSync(dir);
      nodetypes.forEach(n => this.nodeTypes.push({ index: `${n}`, name: n }));
    } catch (e) {
      alert(e);
    }

    new MenuHandler(this);

    window.addEventListener("offline", e => {
      this.$message.error("Error, network unavailable");
      this.online = false;
    });
    window.addEventListener("online", e => {
      this.$message("Network restored");
      this.online = true;
    });
  }
};
</script>

<style>
/* CSS */
</style>
