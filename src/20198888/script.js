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
const SCOPES =
  "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send";

let tokenClient;
let gapiInited = false;
let gisInited = false;
console.log(document.getElementById("authorize_button"));
document.getElementById("authorize_button").style.visibility = "hidden";
document.getElementById("signout_button").style.visibility = "hidden";
document.getElementById("data-table").style.visibility = "hidden";
document.getElementById("send_mail_button").style.visibility = "hidden";
document.getElementById("popup-form").style.display = "none";
document.getElementById("popup-form-2").style.display = "none";

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
    document.getElementById("send_mail_button").style.visibility = "visible";
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

// Handle emails

async function listEmailIds() {
  let response;
  try {
     response = await gapi.client.gmail.users.messages.list({
      userId: "me",
      labelIds: "INBOX",
    });

    response.execute(function (response) {
      $.each(response.messages, function () {
        var messageRequest = gapi.client.gmail.users.messages.get({
          userId: "me",
          id: this.id,
        });

        messageRequest.execute(appendMessageRow);
      });
    });
  } catch (err) {
    document.getElementById("content").innerText = err.message;
    return [];
  }
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
    content.innerHTML = html;
    popup.style.display = "flex";
  } catch (err) {
    console.log(err);
  }
}

function getHeader(headers, index) {
  var header = "";
  $.each(headers, function () {
    if (this.name.toLowerCase() === index.toLowerCase()) {
      header = this.value;
    }
  });
  return header;
}

function appendMessageRow(message) {
  $(".table-inbox tbody").append(
    "<tr>\
            <td>" +
      getHeader(message.payload.headers, "From") +
      '</td>\
            <td>\
              <a href="#message-modal-' +
      message.id +
      '" data-toggle="modal" id="message-link-' +
      message.id +
      '">' +
      getHeader(message.payload.headers, "Subject") +
      "</a>\
            </td>\
            <td>" +
      getHeader(message.payload.headers, "Date") +
      "</td>\
          </tr>"
  );
  var reply_to = (
    getHeader(message.payload.headers, "Reply-to") !== ""
      ? getHeader(message.payload.headers, "Reply-to")
      : getHeader(message.payload.headers, "From")
  ).replace(/\"/g, "&quot;");

  var reply_subject =
    "Re: " +
    getHeader(message.payload.headers, "Subject").replace(/\"/g, "&quot;");
  $("body").append(
    '<div class="modal fade" id="message-modal-' +
      message.id +
      '" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">\
            <div class="modal-dialog modal-lg">\
              <div class="modal-content">\
                <div class="modal-header">\
                  <button type="button"\
                          class="close"\
                          data-dismiss="modal"\
                          aria-label="Close">\
                    <span aria-hidden="true">&times;</span></button>\
                  <h4 class="modal-title" id="myModalLabel">' +
      getHeader(message.payload.headers, "Subject") +
      '</h4>\
                </div>\
                <div class="modal-body">\
                  <iframe id="message-iframe-' +
      message.id +
      '" srcdoc="<p>Loading...</p>">\
                  </iframe>\
                </div>\
                <div class="modal-footer">\
                  <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>\
                  <button type="button" class="btn btn-primary reply-button" data-dismiss="modal" data-toggle="modal" data-target="#reply-modal"\
                  onclick="fillInReply(\
                    \'' +
      reply_to +
      "', \
                    '" +
      reply_subject +
      "', \
                    '" +
      getHeader(message.payload.headers, "Message-ID") +
      "'\
                    );\"\
                  >Reply</button>\
                </div>\
              </div>\
            </div>\
          </div>"
  );
  $("#message-link-" + message.id).on("click", function () {
    var ifrm = $("#message-iframe-" + message.id)[0].contentWindow.document;
    $("body", ifrm).html(getBody(message.payload));
  });
}

function getBody(message) {
  var encodedBody = "";
  if (typeof message.parts === "undefined") {
    encodedBody = message.body.data;
  } else {
    encodedBody = getHTMLPart(message.parts);
  }
  encodedBody = encodedBody
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .replace(/\s/g, "");
  return decodeURIComponent(escape(window.atob(encodedBody)));
}

async function getEmail(id) {
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

function openSendEmail() {
  let popup = document.getElementById("popup-form-2");
  popup.style.display = "flex";
}

function sendEmail() {
  const sender = "the.shy.garena2@gmail.com";
  const receiver = document.getElementById("email_receiver");
  const content = document.getElementById("content");
  const subject = document.getElementById("tieu_de");

  const message = `From: ${sender}\r\n" + 
"To: ${receiver}\r\n" +
"Subject: ${subject}\r\n\r\n" +
 ${content} `;

  // The body needs to be base64url encoded.
  const encodedMessage = btoa(message);
  const reallyEncodedMessage = encodedMessage
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  gapi.client.gmail.users.messages
    .send({
      userId: "me",
      resouce: {
        raw: reallyEncodedMessage,
      },
    })
    .then(function () {
      console.log("done!");
    });
}
