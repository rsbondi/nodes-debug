<template>
  <div>
    <el-row :gutter="6" style="height: 100%">
      <el-col :span="12" style="height: 100%; padding-bottom: 2px;">
      <monaco-editor
        class="editor"
        v-model="code"
        :require="amdRequire"
        v-on:editorMount="editorMount"
        :options="{minimap: {enabled: false}, folding: true, glyphMargin: false,lineNumbers: false, fontSize: '11px', scrollbar: { vertical: 'hidden' }}"
        language="javascript">
      </monaco-editor>
      </el-col>
      <el-col :span="12" style="height: 100%; padding-bottom: 2px; padding-right: 5px;">
      <monaco-editor
        class="editor"
        v-model="result"
        :require="amdRequire"
        v-on:editorMount="resultMount"
        :options="{folding: true, readOnly: true, lineNumbers: false, fontSize: '11px'}"
        language="javascript">
      </monaco-editor>
      </el-col>
    </el-row>
    
  </div>
</template>

<script>
import Empty from "./Empty";
import Vue from "vue";
import MonacoEditor from "vue-monaco";
var path = require("path");

function uriFromPath(_path) {
  var pathName = path.resolve(_path).replace(/\\/g, "/");
  if (pathName.length > 0 && pathName.charAt(0) !== "/") {
    pathName = "/" + pathName;
  }
  return encodeURI("file://" + pathName);
}

amdRequire.config({
  baseUrl: uriFromPath(
    path.join(__dirname, (process.env.NODE_ENV === 'development' ? "../../.." : "../../") +"/node_modules/monaco-editor/min")
  )
});
// workaround monaco-css not understanding the environment
self.module = undefined;
// workaround monaco-typescript not understanding the environment
self.process.browser = true;
const { remote } = require("electron");

export default {
  name: "console-view",
  require: amdRequire,
  components: { MonacoEditor, Empty },
  props: ["page"],
  methods: {
    amdRequire: amdRequire,
    editorMount(e) {
      this.commandEditor = e;

      this.commandEditor.addAction({
        id: "action-execute-command",
        label: "Execute RPC command",
        keybindings: [monaco.KeyCode.F5],
        precondition: null,
        keybindingContext: null,
        contextMenuGroupId: "navigation",
        contextMenuOrder: 1.1,

        run: ed => {
          window.controllerInstances[
            this.$store.state.Nodes.currentIndex
          ].execute(ed);
        }
      });

      this.commandEditor.addAction({
        id: "action-selection-reverse-command",
        label: "Reverse Bytes",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_R],
        precondition: null,
        keybindingContext: null,
        contextMenuGroupId: "navigation",
        contextMenuOrder: 1.1,
        run: function(ed) {
          const selection = ed.getSelection();
          const str = ed.getModel().getValueInRange(selection);
          let buf = [];
          for (let i = 0; i < str.length; i += 2) {
            buf.push(str.slice(i, i + 2));
          }
          ed.executeEdits("", [
            { range: selection, text: buf.reverse().join("") }
          ]);
          return null;
        }
      });


      window.commandEditor = this.commandEditor; // this kills the store, so window

      this.commandRegistered = true;
      this.registerMe();
    },
    resultMount(e) {
      this.resultEditor = e;
      this.resultEditor.addAction({
        id: "action-result-clear-command",
        label: "Clear Console",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_L],
        precondition: null,
        keybindingContext: null,
        contextMenuGroupId: "navigation",
        contextMenuOrder: 1.1,
        run: function(ed) {
          ed.setValue("");
          return null;
        }
      });

      this.resultEditor.addAction({
        id: "action-id-insert-command",
        label: "Add to command",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_I],
        precondition: null,
        keybindingContext: null,
        contextMenuGroupId: "navigation",
        contextMenuOrder: 1.1,
        run: function(ed) {
          const line = ed
            .getModel()
            .getLineContent(ed.getPosition().lineNumber);
          const tokens = monaco.editor.tokenize(line, "javascript")[0];
          let t = tokens.length - 1;
          for (; ~t; t--) {
            const token = tokens[t];
            if (token.offset <= ed.getPosition().column) break;
          }
          const token = tokens[t];
          const word = line.slice(
            token.offset,
            t == tokens.length - 1 ? line.length : tokens[t + 1].offset
          );
          if (word) {
            const cmd = window.commandEditor.getPosition();
            window.commandEditor.executeEdits("", [
              { range: window.commandEditor.getSelection().clone(), text: word }
            ]);
            const col = cmd.column + word.length;
            window.commandEditor.setSelection(
              new monaco.Range(cmd.lineNumber, col, cmd.lineNumber, col)
            );
            window.commandEditor.focus();
          }
          return null;
        }
      });

      window.resultEditor = this.resultEditor;
      this.resultRegistered = true;
      this.registerMe()
    },
    sizeMe(self) {
      self.$el.style.height = window.innerHeight - 149 + "px";
      if (this.page == "console" && this.commandEditor)
        this.commandEditor.layout();
      if (this.page == "console" && this.resultEditor)
        this.resultEditor.layout();
    },
    registerMe() {
      if (this.resultRegistered && this.commandRegistered) {
        this.$store.commit('console_ready', true)

        const ctype = this.$store.state.Nodes.currentType;``
        if (this.$store.state.Nodes.controllers[ctype] && !~this.$store.state.Nodes.registeredTypes.indexOf(ctype)) {
          this.$store.state.Nodes.controllers[ctype].register(
            this.commandEditor,
            this.resultEditor,
            this.$store
          ).then(() => {
            this.$store.commit('node_controller_type_registered', ctype)
          }).catch(e => this.$message.error(`unable to register controller type ${ctype}, ${e}`))
          if(!window.consoleStates) window.consoleStates = {};
        }
      }
    }
  },
  data() {
    return {
      code: "",
      result: "",
      suffix: "console",
      mutation: "node_set_console",
      serviceName: "ping",
      commandRegistered: false,
      resultRegistered: false
    };
  },
  watch: {
    page: function(newVal, oldVal) {
      this.sizeMe(this);
    }
  },
  mounted() {
    let registeredControllers =[]
    window.consoleStates = {}
    this.$store.subscribe((mut, state) => {
      if(mut.type == "node_controller_type_instantiated" && !~registeredControllers.indexOf(mut.payload)) {
        registeredControllers.push(mut.payload)
        this.registerMe()
      }
    })
    window.addEventListener("resize", e => {
      this.sizeMe(this);
    });
  }
};
</script>

<style>
.editor {
  width: 100%;
  height: 100%;
  border: 1px solid lightgray;
}
</style> 