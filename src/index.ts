import MyAlgoConnect, { CallApplTxn } from '@randlabs/myalgo-connect';
import algosdk from 'algosdk';

class App {
  // main element
  elem: HTMLElement;

  // algorand data
  wallet    : any;
  algodClient: any;
  accounts  : any;
  addresses : any;
  appid     : number = 345668314;

  // game data
  isConnected : boolean;
  localState  : object;
  globalState : object;

  // some html element containers
  btns  : HTMLElement;
  box   : HTMLElement;
  prices: HTMLElement;

  constructor() {

    this.elem = document.createElement('div');
    this.btns = document.createElement('div');

    this.prices = document.createElement('div');
    this.prices.id = "prices";

    this.box = document.createElement('div');
    this.box.id = "box";

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
    this.elem.appendChild(this.btns);
    this.elem.appendChild(this.box);

    document.getElementById("root").appendChild(this.prices);

  }

  /**
   * Connect to an algorand account via the MyAlgoConnect
   */
  async connect() {
    try {
      this.isConnected = true;
      this.accounts = await this.wallet.connect();
      this.addresses = this.accounts.map(account => account.address);

      document.getElementById("connect").style.display = 'none';
      document.getElementById("optin").style.display = 'block';

      this.readapp();

    } catch(err) {
      console.error(err);
    }
  }
  
  /**
   * Call the application
   */
  async mint() {
    try {
      let txnn = await this.algodClient.getTransactionParams().do();
      let txn: CallApplTxn = {
        ...txnn,
        from: this.addresses[0],
        fee: 1000,
        flatFee: true,
        appIndex: this.appid,
        type: 'appl',
        appArgs: [btoa("mint")],
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
   * The data needs to be decoded from base64 to ASCII text
   */
  async readapp() {
    try {
      // read the global state
      let globalState = await this.algodClient.getApplicationByID(this.appid).do();
      var _global = {};
      for (var key in globalState.params['global-state']) {
        let r = globalState.params['global-state'][key];
        _global[atob(r.key)] = r.value;
      }
      console.log(_global);

      // read the local state
      let localState = await this.algodClient.accountInformation(this.addresses[0]).do();
      var local = {};
      for (var app in localState['apps-local-state']) {
        // check for our app
        if (localState['apps-local-state'][app]['id'] === this.appid) {
          for (var key in localState['apps-local-state'][app]['key-value']) {
            let r = localState['apps-local-state'][app]['key-value'][key];
            local[atob(r.key)] = r.value;
          }
        }
      }
      console.log(local);

      // check for differences
      if (this.globalState !== _global) {
        console.log("global state changed");
      }
      
      if (this.localState !== local) {
        console.log("local state changed");
      }

      // store recent state
      this.globalState = _global;
      this.localState = local;

      this.update();

    } catch (err) {
      console.error(err);
    }
  }

  async update() {
    if (this.localState !== null && Object.keys(this.localState).length !== 0) {
      this.box.innerHTML = `
        Green: ${this.localState.green.uint}
        Gold: ${this.localState.gold.uint}
        Silver: ${this.localState.silver.uint}
        Bronze: ${this.localState.bronze.uint}
      `;
      document.getElementById("call").style.display = 'block';
      document.getElementById("optin").style.display = 'none';
      document.getElementById("optout").style.display = 'block';
    } else {
    this.box.innerHTML = `
      Please opt into the app before you can view your reserves.
    `;
      console.log("You need to have logged into the app");
    }

    let greenReserveAddr  = atob(this.globalState['green_reserve'].bytes);
    let goldReserveAddr   = atob(this.globalState['gold_reserve'].bytes);
    let silverReserveAddr = atob(this.globalState['silver_reserve'].bytes);
    let bronzeReserveAddr = atob(this.globalState['bronze_reserve'].bytes);

    let green_reserve   = await this.algodClient.accountInformation(greenReserveAddr).do();
    let gold_reserve    = await this.algodClient.accountInformation(goldReserveAddr).do();
    let silver_reserve  = await this.algodClient.accountInformation(silverReserveAddr).do();
    let bronze_reserve  = await this.algodClient.accountInformation(bronzeReserveAddr).do();

    let greenPrice  = (green_reserve.amount/1000000)/this.globalState['green'].uint;
    let goldPrice   = (gold_reserve.amount/1000000)/this.globalState['gold'].uint;
    let silverPrice = (silver_reserve.amount/1000000)/this.globalState['silver'].uint;
    let bronzePrice = (bronze_reserve.amount/1000000)/this.globalState['bronze'].uint;

    this.prices.innerText = `
      1 GREEN   = ${greenPrice} ALGO
      1 GOLD    = ${goldPrice} ALGO
      1 SILVER  = ${silverPrice} ALGO
      1 BRONZE  = ${bronzePrice} ALGO
    `;
  }

  showReserves() {
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
    let wrapper = document.createElement('div');
    wrapper.id = "wrapper";

    let marc = document.createElement('img');
    marc.id = "marc";
    marc.src = "./assets/face1.png";

    wrapper.appendChild(marc);
    wrapper.appendChild(this.elem);
    document.getElementById("root").appendChild(wrapper);
  }

  async optin() {
    await this.opt(1);
    await this.readapp();
    document.getElementById("optin").style.display = "none";
    document.getElementById("optout").style.display = "block";
  }

  async optout() {
    await this.opt(2);
    await this.readapp();
    document.getElementById("optin").style.display = "block";
    document.getElementById("optout").style.display = "none";
  }

  async opt(action) {
    try {
      let txnn = await this.algodClient.getTransactionParams().do();
      let txn: CallApplTxn = {
        ...txnn,
        from: this.addresses[0],
        fee: 1000,
        flatFee: true,
        appIndex: this.appid,
        type: 'appl',
        appOnComplete: action,
      };

      let signedTxn = await this.wallet.signTransaction(txn);
      await this.algodClient.sendRawTransaction(signedTxn.blob).do();
      if (action === 1) {
        this.box.innerText = "You have successfully opted in! You can now try your luck at winning tokens!";
      } else {
        this.box.innerText = "You have successfully opted out! You won't be able to play anymore!";
      }
      this.readapp();
    } catch(e) {
      console.error(e.response.text);
      this.box.innerText = e.response.text;
    }
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
callappbtn.innerText = "Mint";
callappbtn.onclick = async function() {
  app.mint();
}


let optinbtn = document.createElement('button');
optinbtn.id = "optin";
optinbtn.style.display = "none";
optinbtn.innerText = "Opt In";
optinbtn.onclick = async function() {
  app.optin();
}

let optoutbtn = document.createElement('button');
optoutbtn.id = "optout";
optoutbtn.style.display = "none";
optoutbtn.innerText = "Opt Out";
optoutbtn.onclick = async function() {
  app.optout();
}

app.addbtn(btn);
app.addbtn(callappbtn);
app.addbtn(optoutbtn);
app.addbtn(optinbtn);

window['app'] = app; // debugging

app.render();
