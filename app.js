import { html, Component, render } from './js/spux.js'
import { getPath, getQueryStringValue, loadFile, saveFile } from './util.js'
// import './css/style.css'
import './js/dior.js'

await awaitForNostr();
const userPublicKey = await window.nostr.getPublicKey();


function awaitForNostr() {
  return new Promise(resolve => {
    let intervalTime = 2;
    const maxIntervalTime = 500;
    const maxElapsedTime = 5000;
    let elapsedTime = 0;
    const intervalId = setInterval(() => {
      elapsedTime += intervalTime;
      if (typeof window.nostr !== 'undefined') {
        clearInterval(intervalId);
        resolve();
      } else if (elapsedTime >= maxElapsedTime) {
        clearInterval(intervalId);
        resolve();
      } else {
        intervalTime = Math.min(intervalTime * 1.5, maxIntervalTime);
      }
    }, intervalTime);
  });
}

class UserProfile extends Component {
  render() {
    const { userPublicKey, name, picture, about, banner } = this.props;

    return html`
      <div class="user-profile">
      ${banner ? html`<div class="banner"><img src="${banner}" alt="Banner" /></div>` : ''}
      <br/>

      
      <h2>${name}</h2>

        <img src="${picture}" alt="Profile Picture" class="user-picture" />
        <p>Pubkey: ${userPublicKey}</p>
        ${about ? html`<p>${about}</p>` : ''}
      </div>
    `;
  }
}

class SocialLinks extends Component {
  render() {
    const { website, github } = this.props;

    return html`
      <div class="social-links">
        <h3>Connect</h3>
        ${website ? html`<a href="${website}" target="_blank">Website</a>` : ""}
        ${github ? html`<br/><a href="https://github.com/${github}" target="_blank">Github</a>` : ""}
        <br/><a href="https://facebook.com" target="_blank">Facebook</a>
        <br/><a href="https://twitter.com" target="_blank">Twitter</a>
        <br/><a href="https://instagram.com" target="_blank">Instagram</a>
        <h3>Contacts</h3>
      </div>
    `
  }
}


export class App extends Component {
  constructor() {
    super();
    this.fetchProfile = this.fetchProfile.bind(this);

    const serverUrl = getQueryStringValue('storage') || di.data.storage || 'https://nosdav.nostr.rocks'
    const mode = getQueryStringValue('mode') || di.data.m || 'm'
    const uri = getQueryStringValue('uri') || di.data.uri || 'profile.json'

    const profilePubkey = getQueryStringValue('pubkey')

    this.state = {
      userPublicKey: null,
      filename: uri,
      fileContent: '',
      bookmarks: [],
      newBookmarkUrl: '',
      serverUrl: serverUrl,
      mode: mode,
      profilePubkey: profilePubkey
    };
  }

  saveTasks = async () => {
    const { tasks, userPublicKey, serverUrl, mode, filename } = this.state;
    const fileContent = JSON.stringify(tasks);
    const success = await saveFile(serverUrl, userPublicKey, filename, mode, fileContent);

    if (!success) {
      alert('Error saving tasks');
    }
  };


  userLogin = async () => {
    await awaitForNostr();
    var userPublicKey = await window.nostr.getPublicKey();
    if (this.state.profilePubkey) {
      userPublicKey = this.state.profilePubkey;
    }
    console.log(`Logged in with public key: ${userPublicKey}`);
    await this.setState({ userPublicKey: userPublicKey });
    // Use an arrow function here
    this.fetchProfile(userPublicKey, () => this.render());
  };


  async componentDidMount() {
    await this.userLogin()
    this.fetchProfile(this.state.userPublicKey, this.render.bind(this))
  }

  // fetchProfile.js
  fetchProfile(pubkey, render) {
    const NOSTR_RELAY_URL = 'wss://nostr-pub.wellorder.net';

    let wss = new WebSocket(NOSTR_RELAY_URL);
    let kind = 0;
    let id = 'profile';
    wss.onopen = function () {
      const req = `["REQ", "${id}", { "kinds": [${kind}], "authors": ["${pubkey}"] }]`;
      wss.send(req);
    };

    // Use an arrow function here
    wss.onmessage = (msg) => {
      const response = JSON.parse(msg.data);

      if (response && response[2]) {
        const data = response[2];
        console.log(data);
        const content = JSON.parse(data.content);

        this.setState({
          name: content.name,
          picture: content.picture,
          website: content.website,
          about: content.about,
          banner: content.banner,
          github: content.identities?.[0]?.claim,
        });

        render();
      } else {
        console.error('Invalid or undefined data received:', msg.data);
      }
    };
  }

  render() {
    const { userPublicKey, fileContent, name, picture, website, about, banner, github } = this.state;

    return html`
      <div id="container">

        <div class="content">
          <${UserProfile}
            userPublicKey="${userPublicKey}"
            name="${name}"
            picture="${picture}"
            about="${about}"
            banner="${banner}"
          />
          <${SocialLinks}
            website="${website}"
            github="${github}"
          />
        </div>

        <div class="file-section">
          <label for="content">Config</label>
  
          <textarea
            id="file-content"
            placeholder="Empty..."
            name="content"
            rows="10"
            value="${JSON.stringify(di.data, null, 2)}"
            onInput="${this.updateFileContent}"
          ></textarea>
          <div>
            ${userPublicKey
        ? html`
                  <button id="save" onClick="${this.saveProfile}">Save</button>

                `
        : html` <button id="login" onClick="${this.userLogin}">
                  Login
                </button>`}
          </div>
        </div>
      </div>
    `
  }
}

render(html` <${App} /> `, document.body)

