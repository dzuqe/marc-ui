/**
 * Author: @dzuqe
 */

import MyAlgoConnect, {CallApplTxn} from '@randlabs/myalgo-connect';
import algosdk from 'algosdk';

class App {
  // main element
  elem: HTMLElement;

  // algorand data
  wallet: any;
  algodClient: any;
  accounts: any;
  addresses: any;
  appid: number = 296143611;

  // game data
  isConnected: boolean;
  gamestate: object;

  btns: HTMLElement;

  constructor() {
    this.elem = document.createElement('div');
    this.btns = document.createElement('div');
    this.elem.id = 'viewport';
    this.wallet = new MyAlgoConnect();

    // Private network
    //this.algodClient = new algosdk.Algodv2(
    //  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 
    //  'http://127.0.0.1', 
    //  '4001'
    //);

    // Open public algoexplorer node
    this.algodClient = new algosdk.Algodv2(
      '', 
      'https://api.algoexplorer.io', 
      ''
    );

    this.gamestate = null;
  }

  /**
   * Connect to an algorand account via the MyAlgoConnect
   */
  async connect() {
    try {
      this.isConnected = true;
      this.accounts = await this.wallet.connect();
      this.addresses = this.accounts.map(account => account.address);

      this.readapp();

    } catch(err) {
      console.error(err);
    }
  }
  
  /**
   * Call the application
   */
  async callapp() {
    try {
      let txnn = await this.algodClient.getTransactionParams().do();
      let txn: CallApplTxn = {
        ...txnn,
        from: this.addresses[0],
        fee: 1000,
        flatFee: true,
        appIndex: this.appid,
        type: 'appl',
        appArgs: [btoa("take_shot")],
        appOnComplete: 0,
      };

      let signedTxn = await this.wallet.signTransaction(txn);
      await this.algodClient.sendRawTransaction(signedTxn.blob).do();
      this.readapp();
    } catch(err) {
      console.error(err);
    }
  }

  /**
   * Read the application
   */
  async readapp() {
    try {
      let app = await this.algodClient.getApplicationByID(this.appid).do();
      var recentState = {};
      for (var key in app.params['global-state']) {
        let r = app.params['global-state'][key];
        recentState[atob(r.key)] = r.value;
      }

      // check for differences

      // update state
      this.gamestate = recentState;
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * Utilties
   */
  addbtn(btn: HTMLElement) {
    this.btns.appendChild(btn);
  }

  /**
   * Display the application
   */
  render() {
    document.getElementById("root").appendChild(this.elem);
  }
};

// main program
let app: App = new App();

let btn = document.createElement('button');
btn.id = "connect"
btn.innerText = "Connect Wallet";
btn.onclick = async function() {
  app.connect();
}

let callappbtn = document.createElement('button');
callappbtn.id = "call";
callappbtn.style.display = "none";
callappbtn.innerText = " 🔫 Take Shot";
callappbtn.onclick = async function() {
  app.callapp();
}

app.addbtn(btn);
app.addbtn(callappbtn);

window['app'] = app; // debugging

app.render();
