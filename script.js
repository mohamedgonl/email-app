/* exported gapiLoaded */
/* exported gisLoaded */
/* exported handleAuthClick */
/* exported handleSignoutClick */

// TODO(developer): Set to client ID and API key from the Developer Console
const CLIENT_ID =
  "280310238212-q98mvklnee54mkjgt8jthl08v4m61fb6.apps.googleusercontent.com";
const API_KEY = "AIzaSyCpv80a8sOD46R4BYjMAHPkBlsBEWmTFu8";

// Discovery doc URL for APIs used by the quickstart
const DISCOVERY_DOC =
  "https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest";

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = "https://www.googleapis.com/auth/gmail.readonly";

let tokenClient;
let gapiInited = false;
let gisInited = false;

document.getElementById("authorize_button").style.visibility = "hidden";
document.getElementById("signout_button").style.visibility = "hidden";

/**
 * Callback after api.js is loaded.
 */
function gapiLoaded() {
  gapi.load("client", initializeGapiClient);
}

/**
 * Callback after the API client is loaded. Loads the
 * discovery doc to initialize the API.
 */
async function initializeGapiClient() {
  await gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: [DISCOVERY_DOC],
  });
  gapiInited = true;
  maybeEnableButtons();
}

/**
 * Callback after Google Identity Services are loaded.
 */
function gisLoaded() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: "", // defined later
  });
  gisInited = true;
  maybeEnableButtons();
}

/**
 * Enables user interaction after all libraries are loaded.
 */
function maybeEnableButtons() {
  if (gapiInited && gisInited) {
    document.getElementById("authorize_button").style.visibility = "visible";
  }
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick() {
  tokenClient.callback = async (resp) => {
    if (resp.error !== undefined) {
      throw resp;
    }
    document.getElementById("signout_button").style.visibility = "visible";
    document.getElementById("authorize_button").innerText = "Refresh";
    await listLabels();
  };

  if (gapi.client.getToken() === null) {
    // Prompt the user to select a Google Account and ask for consent to share their data
    // when establishing a new session.
    tokenClient.requestAccessToken({ prompt: "consent" });
  } else {
    // Skip display of account chooser and consent dialog for an existing session.
    tokenClient.requestAccessToken({ prompt: "" });
  }
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick() {
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token);
    gapi.client.setToken("");
    document.getElementById("content").innerText = "";
    document.getElementById("authorize_button").innerText = "Authorize";
    document.getElementById("signout_button").style.visibility = "hidden";
  }
}

/**
 * Print all Labels in the authorized user's inbox. If no labels
 * are found an appropriate message is printed.
 */
async function listLabels() {
  let response;
  try {
    response = await gapi.client.gmail.users.messages.list({
      userId: "me",
      labelIds: "INBOX",
    });
  } catch (err) {
    document.getElementById("content").innerText = err.message;
    return;
  }
  response = await gapi.client.gmail.users.messages.get({
    userId: "me",
    id: response.result.messages[0].id,
  });

  const labels = response.result.labels;
  if (!labels || labels.length == 0) {
    document.getElementById("content").innerText = "No labels found.";
    return;
  }
  // Flatten to string to display
  const output = labels.reduce(
    (str, label) => `${str}${label.name}\n`,
    "Labels:\n"
  );
  document.getElementById("content").innerText = output;
}

function getGmailMessage(userId, messageId) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/${userId}/messages/${messageId}`;

  // Tạo đối tượng XMLHttpRequest
  const xhr = new XMLHttpRequest();

  // Thiết lập hàm xử lý khi nhận được phản hồi từ máy chủ
  xhr.onreadystatechange = function () {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      if (xhr.status === 200) {
        // Xử lý phản hồi thành công
        const response = JSON.parse(xhr.responseText);
        console.log(response);
        // Thực hiện các thao tác khác với phản hồi
      } else {
        // Xử lý phản hồi không thành công
        console.error("Lỗi khi gửi yêu cầu:", xhr.status);
      }
    }
  };

  // Thiết lập phương thức và URL yêu cầu
  xhr.open("GET", url, true);

  // Thiết lập tiêu đề yêu cầu (nếu cần)
  xhr.setRequestHeader("Authorization", "Bearer YOUR_ACCESS_TOKEN");

  // Gửi yêu cầu
  xhr.send();
}
