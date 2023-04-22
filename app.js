import { html, Component, render } from './js/spux.js'
import { getPath, getQueryStringValue, loadFile, saveFile } from './util.js'
import { findNestedObjectById } from './js/linkedobjects.js'

// import './css/style.css'
import './js/dior.js'

// await awaitForNostr();
// const userPublicKey = await window.nostr.getPublicKey();


function awaitForNostr() {
  return new Promise(resolve => {
    let intervalTime = 2;
    const maxIntervalTime = 500;
    const maxElapsedTime = 5000;
    let elapsedTime = 0;
    const intervalId = setInterval(() => {
      console.log(intervalTime, elapsedTime)
      elapsedTime += intervalTime;
      if (typeof window.nostr !== 'undefined') {
        console.log('nostr found')
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
    const { website, github, apps, twitter } = this.props;

    return html`
      <div class="social-links">
        <h3>Connect</h3>
        ${website ? html`<a href="${website}" target="_blank">Website</a>` : ""}
        ${github ? html`<br/><a href="https://github.com/${github}" target="_blank">Github</a>` : ""}
        ${twitter ? html`<br/><a href="https://twitter.com/${twitter}" target="_blank">Twitter</a>` : ""}

        <h3>Apps</h3>
        ${apps.map(app => html`
          <a href="${app.uri}" target="_blank">${app.label || app.uri}</a><br/>
        `)}
        <h3>Contacts</h3>

      </div>
    `
  }
}



// APP
export class App extends Component {
  constructor() {
    super();
    this.fetchProfile = this.fetchProfile.bind(this);

    const serverUrl = getQueryStringValue('storage') || di.data[0].storage || 'https://nosdav.nostr.rocks'
    const mode = getQueryStringValue('mode') || di.data[0].m || 'm'
    const uri = getQueryStringValue('uri') || di.data[0].uri || 'profile.json'

    const profilePubkey = getQueryStringValue('pubkey')

    var key
    if (di.data[0].mainEntity['@id']) {
      key = di.data[0].mainEntity['@id'].replace('nostr:pubkey:', '')
    } else {
      key = this.userPublicKey
    }

    var apps = findNestedObjectById(di.data, 'nostr:pubkey:' + key)?.mainEntity?.app || []

    this.state = {
      userPublicKey: null,
      filename: uri,
      fileContent: '',
      bookmarks: [],
      newBookmarkUrl: '',
      serverUrl: serverUrl,
      mode: mode,
      profilePubkey: profilePubkey,
      apps: apps
    };
  }


  saveProfile = async () => {
    const { userPublicKey, serverUrl, mode, filename } = this.state;

    di.data[0].mainEntity['@id'] = 'nostr:pubkey:' + userPublicKey;

    async function replaceScriptTagContent() {
      const improvedRegex = /(<script[^>]*type\s*=\s*(['"])application[^>]*\2[^>]*>)([\s\S]*?)(<\/script>)/gim;

      // Fetch the current HTML page content
      const response = await fetch(location.href);
      const html = await response.text();

      // Replace the script tag content with a pretty-printed, stringified version of di.data
      const replacedScriptTagContent = html.replace(improvedRegex, (match, openingTag, quote, content, closingTag) => {
        return `${openingTag}${JSON.stringify(di.data, null, 2)}${closingTag}`;
      });

      const newHtml = replaceRelativePath(replacedScriptTagContent);
      // Log the new output to the console
      console.log(newHtml);

      return newHtml;
    }

    function replaceRelativePath(html) {
      const baseUrl = new URL(location.href);
      baseUrl.pathname = baseUrl.pathname.substring(0, baseUrl.pathname.lastIndexOf('/') + 1);
      const relativePathRegex = /(\.\/)/g;

      return html.replace(relativePathRegex, (match) => {
        return `${baseUrl.origin}${baseUrl.pathname}`;
      });
    }



    // Create a wrapper function to call the replaceScriptTagContent function
    var fileContent = await replaceScriptTagContent();
    // fileContent = replaceRelativePath(fileContent);

    const success = await saveFile(serverUrl, userPublicKey, filename, mode, fileContent);


    if (!success) {
      alert('Error saving profile');
    }
  };


  userLogin = async () => {
    await awaitForNostr();
    var userPublicKey = await window.nostr.getPublicKey();
    if (this.state.profilePubkey) {
      userPublicKey = this.state.profilePubkey;
    }
    var key
    if (!di.data[0].mainEntity['@id']) {
      di.data[0].mainEntity['@id'] = 'nostr:pubkey:' + userPublicKey
      key = userPublicKey
    } else {
      key = di.data[0].mainEntity['@id'].replace('nostr:pubkey:', '')
    }
    console.log(`Logged in with public key: ${userPublicKey}`);
    await this.setState({ userPublicKey: userPublicKey, apps: findNestedObjectById(di.data, 'nostr:pubkey:' + key)?.mainEntity?.app || [] })
    // Use an arrow function here
    var key
    if (di.data[0].mainEntity && di.data[0].mainEntity['@id']) {
      key = di.data[0].mainEntity['@id'].replace('nostr:pubkey:', '')
    } else {
      key = this.state.userPublicKey
    }

    this.fetchProfile(key, () => this.render());
  };


  async componentDidMount() {
    var key
    if (di.data[0].mainEntity && di.data[0].mainEntity['@id']) {
      key = di.data[0].mainEntity['@id'].replace('nostr:pubkey:', '')
    } else {
      await this.userLogin()
      key = this.state.userPublicKey
    }
    this.fetchProfile(key, this.render.bind(this))
  }

  // fetchProfile.js
  fetchProfile(pubkey, render) {
    const NOSTR_RELAY_URL = 'wss://nostr-pub.wellorder.net';

    var key
    if (di.data[0].mainEntity && di.data[0].mainEntity['@id']) {
      key = di.data[0].mainEntity['@id'].replace('nostr:pubkey:', '')
    } else {
      key = this.state.userPublicKey
    }

    let wss = new WebSocket(NOSTR_RELAY_URL);
    let kind = 0;
    let id = 'profile';
    wss.onopen = function () {
      const req = `["REQ", "${id}", { "kinds": [${kind}], "authors": ["${key}"] }]`;
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
    var key
    if (di.data[0].mainEntity && di.data[0].mainEntity['@id']) {
      key = di.data[0].mainEntity['@id'].replace('nostr:pubkey:', '')
    } else {
      key = this.state.userPublicKey
    }

    var apps = findNestedObjectById(di.data, 'nostr:pubkey:' + key)?.app || []

    const uriWithLabels = apps.map((uri) => {
      const foundObject = findNestedObjectById(di.data, uri);
      const label = foundObject ? foundObject.label : null;
      return { uri, label };
    });

    console.log(uriWithLabels);

    return html`
      <div id="container">

        <div class="content">
          <${UserProfile}
            userPublicKey="${key}"
            name="${name}"
            picture="${picture}"
            about="${about}"
            banner="${banner}"
          />
          <${SocialLinks}
            website="${website}"
            github="${github}"
            apps="${uriWithLabels}"
          />
        </div>

        <div class="file-section">
          <div>
            ${userPublicKey
        ? html`
                  <button id="save" onClick="${this.saveProfile}">Save Profile</button>

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

