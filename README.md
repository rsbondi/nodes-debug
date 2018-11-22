# nodes-debug

## Description

This is intended to be a general purpose tool to aid in the development of bitcoin or other similar applications(currently only bitcoin core, btcd and lnd supported).

It provides a way to interact with multiple rpc nodes.  

The integrated console lets you talk to multiple nodes from a single interface, the commands feature code completion, signature help, syntax highlighting and folding.  Also, help is provided on hover for all commands.  Command results provide folding for better focus and insertion of result parameters into successive commands.

The project is designed such that multiple node types can be added in the future.

#### Build Setup

``` bash
# install dependencies
npm install

# compile all node types, run once before first run and after edits to files under .nodetypes
npm run compile

# optionally compile selective nodetypes
# npm run compile -- [list of node types space separated]
# ex. npm run compile -- btcd lightning

# serve with hot reload at localhost:9080
npm run dev

# build electron application for production
npm install -g electron-packager
npm run build

# run unit & end-to-end tests
npm test

```

## Usage

### Configuring Nodes

Nodes are configured via the UI and can be saved and retrieved for running multiple configurations.  The configurations are saved as JSON so nodes can be manually configured also if desired.  When the app starts, it will load last loaded configuration automatically.

#### Create nodes using the UI

To add a node to the current configuration, click the + icon to the upper right of the interface.  A dialog will appear

![dialog](image/dialog.png)

All parameters are optional, defaults will be used, **Name** is recommended as it appears in the tab, also **port**(or **config** if `rpcport` is set there) since the default is mainnet

* **Node Type**: The type of the node (bitcoin/btcd/third party)
* **Name**: What you want to call it, this will appear it it's tab
* **Host**: Node's IP address
* **Port**: The RPC port of the node
* **Config**: Path to configuration file, this is where the node's RPC authentication information is located in format of standard `bitcoin.conf`(btcd.conf, lnd.conf or format of third party's choosing)

After one or more nodes are added, you can save the configuration by selecting form the menu `Config -> Save`

#### Manually creating
Saving from the UI will create a JSON file like this, you can create manually and load rather than using the UI if preferred.

``` JSON
[
   {
      "name": "Alice",
      "type": "bitcoin",
      "port": "18654",
      "host": "127.0.0.1",
      "config": "~/regtest/alice/bitcoin.conf",
      "index": "n1521588alice"
   },
   {
      "name": "Bob",
      "type": "bitcoin",
      "port": "18554",
      "host": "127.0.0.1",
      "config": "~/regtest/bob/bitcoin.conf",
      "index": "n15bob"
   }
]
```

The index must be unique, the UI will use the timestamp but this can be anything.

To load saved or manually created configuration, from the menu choose `Config -> Load`

### Using the console

Commands are entered in the left pane and when executed results display in the right.

For the default node type of 'bitcion', a single command may be multi line. Leave whitespace for argument separation, JSON objects are parsed as a single argument.

example:

```
addmultisigaddress 2
[
    "key1",
    "key2"
]
```

#### Using with lnd

Currently streaming subscriptions are supported, but streaming requests are not yet supported, you can use the "Sync" version instead for now, `openChannelSync`, `sendPaymentSync`, and `sendToRouteSync` respectively.

### Features example, light theme

![bob and alice](image/alice_pay_bob.gif)
Commands are executed by pressing F5, pressing the codelens helper or from the context menu.

### Notification dark theme (BTCD)

![dialog](image/notify.gif)

# Development

Notice, developing third party node types is encouraged, but please check with me before doing so, the architecture is likely to change as more insight is gained in development.

This utility supports multiple node types.  It ships with `bitcoin`(bitcoin core) and `btcd`.  The node types are defined in the `.nodetypes` directory.  To create a node of a different type, follow the example in the `bitcoin` directory.  The `${your_node_type}Controller.js` file needs to implement the methods that do not begin with an underscore.  For questions feel free contact me directly.

Also, if your module uses external packages that are not in the root `package.json` file of this repository, you will need to include your own `package.json` file, you only need to include packages that are not already covered in the root file.  See `.nodetypes/src/btcd/package.json` as an example, which uses `ws` package.

Probably a good module development strategy would be to fork this repository, create your own branch and build and test there.  When satisfied, you can release just the source and the build to your own repo.  

So for example, if you want to create for ethereum, add the `ethereum` directory to the `.nodetypes/src` directory of the branch on your fork.  Add files for the console and peers, allong with the controller file. So the directory should look something like `EthereumController.js`, `EthereumInfo.vue` and `EthereumPeers.vue`.  The controller must end in Controller.js, for the others the naming is not important but best to stick to the convention.  The info and peers files are flexible as to how you want to display the data, just so it coordinates with the controller.

To add a third pary node type to an existing installation, add the subdirectory to `resources/app/dist/build_nodetypes` in the packaged app.

# Disclaimer
This is meant as a development tool and suggested to use on testnet or regtest, use on mainnet at your own risk.

---

This project was generated with [electron-vue](https://github.com/SimulatedGREG/electron-vue) using [vue-cli](https://github.com/vuejs/vue-cli). Documentation about the original structure can be found [here](https://simulatedgreg.gitbooks.io/electron-vue/content/index.html).
