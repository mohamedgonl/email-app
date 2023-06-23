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
document.getElementById("data_table").style.visibility = "hidden";
document.getElementById("popup-form").style.display = "none";

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
    await listEmailIds();
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
async function listEmailIds() {
  let response;
  try {
    response = await gapi.client.gmail.users.messages.list({
      userId: "me",
      labelIds: "INBOX",
    });
    response.result.messages.map((e) => {
      getAllEmails(e.id);
    });
  } catch (err) {
    document.getElementById("content").innerText = err.message;
    return [];
  }
}

var i = 0;

function b64DecodeUnicode(str) {
  // Going backwards: from bytestream, to percent-encoding, to original string.
  return decodeURIComponent(
    atob(str)
      .split("")
      .map(function (c) {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join("")
  );
}

async function readEmail(id) {
  try {
    response = await gapi.client.gmail.users.messages.get({
      userId: "me",
      id: id,
      format: "raw",
    });
    let raw = response.result.raw;

    var html = atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
    let popup = document.getElementById("popup-form");
    let input = popup.getElementsByTagName("input");
    let content = document.getElementById("content");
    console.log(content);
    // input[0].value = nameCell.textContent;
    // input[1].value = senderCell.textContent;
    content.innerHTML = html;
    popup.style.display = "flex";
  } catch (err) {
    console.log(err);
  }
}

async function getAllEmails(id) {
  let response;
  try {
    response = await gapi.client.gmail.users.messages.get({
      userId: "me",
      id: id,
      format: "full",
    });

    let item = response.result.payload.headers;

    // Truy cập vào phần tử tbody của bảng
    const tbody = document.querySelector("#data-table tbody");

    const row = document.createElement("tr");

    // Tạo các ô dữ liệu
    const orderCell = document.createElement("td");
    orderCell.textContent = i;
    i++;

    const nameCell = document.createElement("td");
    const senderCell = document.createElement("td");
    const senderEmailCell = document.createElement("td");
    const timeCell = document.createElement("td");
    const detail = document.createElement("td");

    item.map((e) => {
      if (e.name == "Subject") nameCell.textContent = e.value;
      if (e.name == "From") {
        const parts = e.value.split("<");
        senderCell.textContent = parts[0].trim();
        senderEmailCell.textContent = parts[1].replace(">", "").trim();
      }
      if (e.name == "Date") timeCell.textContent = e.value;
    });
    const button = document.createElement("button");
    button.textContent = "Detail";
    button.onclick = () => readEmail(id);
    detail.appendChild(button);

    // Thêm các ô vào hàng
    row.appendChild(orderCell);
    row.appendChild(nameCell);
    row.appendChild(senderCell);
    row.appendChild(senderEmailCell);
    row.appendChild(timeCell);
    row.appendChild(detail);

    // Thêm hàng vào tbody
    tbody.appendChild(row);
  } catch (err) {
    document.getElementById("content").innerText = err.message;
    return [];
  }
}
