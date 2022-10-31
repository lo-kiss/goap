let lastmessage;
let embedSend = false;
let sendRawJson = false;
let uIDs = [];
let usernames = [];
let thechannel = "";
let reply = "";
let image = "";
let theuser = "";
let messages = [];
let thetoken;
let tm;
let socket;
let typingtimeout;
let istyping = false;
let messcont;
let errortimeout;
let connected = false;
let isLogged = false;

/* Helper function */
function qs(s){
    return document.querySelector(s);
}

function autoScroll() {
    qs("#messages").scrollTop = qs("#messages").scrollHeight;
}

if(localStorage.getItem("token") !=undefined){
            thetoken=localStorage.getItem("token");
            login();
}

const loginput = qs(".login-put");
const logerror = qs("#loginerror");

function checkToken(event){
    event.preventDefault();
    if (loginput.value == "cum") {
        logerror.textContent = "The thing that made you. I wish it didn't.";
    } else if (loginput.value == "amogus" || loginput.value == "amongus") {
        logerror.textContent = "AMOGUS";
        qs(".login-logo").style.color = "black";
        qs(".login-section").style.background = "red";
    } else if (loginput.value == "amogi") {
        qs(".login-section").style.transform = "scale(.1)";
    } else if (loginput.value.length < 64) {
        logerror.textContent = "Token is too short. It has to be 64 characters";
    } else if (loginput.value.length > 64) {
        logerror.textContent = "Token is too long. It has to be 64 characters";
    } else {
        login();
    };
}

async function login() {
    if (qs("#token").value) {
        thetoken = qs("#token").value;
        localStorage.setItem("token",thetoken)
    };
    bonfire();
    getdms();
    await fetch("https://api.revolt.chat/users/@me", {
        "credentials": "omit",
        "headers": {
            "Accept": "*/*",
            "x-session-token": thetoken
        },
        "method": "GET"
    })
        .then(response => response.json())
        .then(data => theuser = data)
        .catch(err => showError("INVALID TOKEN"))
    qs(".login-section").style.display = "none";
    qs("#logged").hidden = false;
    qs("#logged").style.display = "flex";
    isLogged = true;
}

async function bonfire() {
    socket = new WebSocket("wss://ws.revolt.chat");
    socket.addEventListener('open', function (event) {
        socket.send(`{
            "type": "Authenticate",
            "token": "${thetoken}"
        }`);
        try {
            setInterval(ping, 10000);
        } catch (error) { showError(error) }
    });

    socket.addEventListener('message', function (event) {
        data = JSON.parse(event.data)
        if (data.type == "Authenticated") {
            connected = true;
            document.querySelector(".status").style.color = "hsl(114,81%,46%)";
            document.querySelector(".status").textContent = "●";
        } else if (data.type == "Message") {
            if (data.channel == thechannel) {
                parsemessage(data);
            }
        } else if (data.type == "Pong") {
            pong()
        } else if (data.type == "Error") {
            if (data.error == "InvalidSession") { showError("INVALID TOKEN"); } else { showError(data.error); }
        } else if (data.type == "Ready") {
            // console.log(JSON.stringify(data.servers))
            getserver(data.servers);
        }
    });

    socket.addEventListener('error', function (event) {
        connected = false;
        qs(".status").style.color = "red";
        showError("Disconnected")
    });

    socket.onclose = function (event) {
        connected = false;
        qs(".status").style.color = "red";
        showError("Disconnected")
    }
}

function ping() {
    socket.send('{"type":"Ping","data":0}');
    tm = setTimeout(async function () {
        connected = false;
        qs(".status").style.color = "red";
        showError("Disconnected")
        while (connected == false) {
            try { bonfire(); } catch (error) { showError(error) }
            await sleep(5000);
        }
    }, 5000);
}

function pong() {

    clearTimeout(tm);
}

async function showError(error) {
    try { clearTimeout(errortimeout); } catch (error) { }
    qs("#loginerror").innerText = error;
    revaSpeech(error);
    qs("#loginerror").hidden = false;
    errortimeout = setTimeout(function () {
        qs('#loginerror').hidden = true;
    }, 10000);
}

async function uploadToAutumn() {
    const files = qs("#file").files
    const formData = new FormData()
    formData.append('myFile', files[0])

    await fetch('https://autumn.revolt.chat/attachments', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            image = data.id;
        })
        .catch(error => {
            showError(error)
        })
}

function embedmessage() {
    document.getElementById("title").hidden = false;
    document.getElementById("desc").hidden = false;
    document.getElementById("color").hidden = false;
    embedSend = true;
}

/* CUSTOM COMMANDS AND CHAT */
qs("#input").onkeypress = function (event) {
    let cmd = qs("#input").value;
    if (event.keyCode == 13 || event.which == 13) {
        if (cmd == "r.gh") {
            revaSpeech(`<a href="https://github.com/lo-kiss/goap/" target="_blank">GOAP Github</a>
<br> Forked from <a href="https://github.com/ERROR-404-NULL-NOT-FOUND/Retaped" target="_blank">Retaped</a>`);
            qs("#input").value = "";
        } else {
            sendmessage();
        }
    } else {
        if (!istyping) {
            clearTimeout(typingtimeout);
            istyping = true
            socket.send(`{
                "type":"BeginTyping",
                "channel":"${thechannel}"
                }`);

            typingtimeout = setTimeout(function () {
                istyping = false;
                socket.send(`{
                    "type":"EndTyping",
                    "channel":"${thechannel}"
                }`);
            }, 1000)
        }
    }
};

function contentToJson() {
    if (!sendRawJson) {
        sendRawJson = true;
    }
    else { sendRawJson = false; }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendmessage() {
    message = qs('#input').value
    if (message.search(/ @[^ ]*/) != -1) {
        pings = /@[^ ]*/[Symbol.match](message)
        for (let i = 0; i < pings.length; i++) {
            message = message.replace(pings[i], `<@${uIDs[usernames.indexOf(pings[i].replace("@", ""))]}>`)
        }
    }
    if (!(embedSend || sendRawJson || reply != "" || qs("#file").files[0])) {
        fetch("https://api.revolt.chat/channels/" + thechannel + "/messages", {
            "credentials": "omit",
            "headers": {
                "Accept": "*/*",
                "Content-Type": "application/json",
                "x-session-token": thetoken
            },
            "body": `{
            "content":"${message}"
        }`,
            "method": "POST"
        })
        qs("#input").value = "";
    }
    else {
        if (reply != "") {
            fetch("https://api.revolt.chat/channels/" + thechannel + "/messages", {
                "credentials": "omit",
                "headers": {
                    "Accept": "*/*",
                    "Content-Type": "application/json",
                    "x-session-token": thetoken
                },
                "body": `{
            "content":"${message}",
            "replies":[{"id":"${reply}","mention":false}]
        }`,
                "method": "POST"
            })
            qs("#input").value = "";
            reply = ""
            qs(".replying-msg").innerText = '';
            qs(".replying-cont").style.display = 'none';
        } else {
            if (qs("#file").files[0]) {
                await uploadToAutumn();
                await fetch("https://api.revolt.chat/channels/" + thechannel + "/messages", {
                    "credentials": "omit",
                    "headers": {
                        "Accept": "*/*",
                        "Content-Type": "application/json",
                        "x-session-token": thetoken
                    },
                    "body": `{
            "content":"${message}",
            "attachments":["${image}"]
        }`,
                    "method": "POST"
                })
                var file = qs("#file");
                file.value = file.defaultValue;
                image = ""
                qs("#input").value = ""
                resetFile();
            } else {
                if (embedSend) {
                    fetch("https://api.revolt.chat/channels/" + thechannel + "/messages", {
                        "credentials": "omit",
                        "headers": {
                            "Accept": "*/*",
                            "Content-Type": "application/json",
                            "x-session-token": thetoken
                        },
                        "body": `{
            "nonce":"",
            "content":"${message}",
            "embeds":[
                {
                    "title":"${document.getElementById("title").value}",
                    "description":"${document.getElementById("desc").value}",
                    "colour":"${document.getElementById("color").value}"
                }
            ]
        }`,
                        "method": "POST"
                    })
                    embedSend = false;
                    document.getElementById("title").hidden = true;
                    document.getElementById("desc").hidden = true;
                    document.getElementById("color").hidden = true;
                    document.getElementById("title").value = "";
                    document.getElementById("desc").value = "";
                    document.getElementById("color").value = "";
                }
                else {
                    fetch("https://api.revolt.chat/channels/" + thechannel + "/messages", {
                        "credentials": "omit",
                        "headers": {
                            "Accept": "*/*",
                            "Content-Type": "application/json",
                            "x-session-token": thetoken
                        },
                        "body": qs("#input").value,
                        "method": "POST"
                    })
                    sendRawJson = false;
                }
            }
        }
    }
}

function clearmessages() {
    messages = [];
    qs('#messages').innerHTML = '';
    messcont = [];
}

async function getdms() {
    await fetch(`https://api.revolt.chat/users/dms`, {
        "credentials": "omit",
        "headers": {
            "Accept": "*/*",
            "x-session-token": thetoken
        },
        "method": "GET",
    })
        .then(response => response.json())
        .then(data => dm = (data))
        .catch(error => { showError(error) });
    // document.querySelector('#selectDM').innerHTML = "";
    for (let i = 0; i < dm.length; i++) {
        try {
            if (dm[i].channel_type == "Group") {
                qs("#selectDM").innerHTML =
                    `<option onclick="
                        theserver='';
                        clearmessages();
                        thechannel = '${dm[i]._id}';
                        getmessage()"
                        id="dm${i}">${dm[i]["name"]}</option>`
                    + qs("#selectDM").innerHTML;

                // document.querySelector('#selectDM').innerHTML = `<button onclick="
                // theserver='';
                // clearmessages();
                // thechannel = '${dm[i]._id}';
                // getmessage()"
                // id="dm${i}">${dm[i]["name"]}</button>`
                //     + document.getElementById('channels').innerHTML
            } else {
                if (dm[i].recipients[0] == theuser._id) {
                    id = dm[i].recipients[1]
                } else {
                    id = dm[i].recipients[0]
                }
                qs("#selectDM").innerHTML =
                    `<option onclick="theserver='';
                        clearmessages();
                        thechannel = '${dm[i]._id}';
                        getmessage()"
                        id="dm${i}">${id}</option>`
                    + qs("#selectDM").innerHTML;

                // document.getElementById('channels').innerHTML = `<button onclick="
                // theserver='';
                // clearmessages();
                // thechannel = '${dm[i]._id}';
                // getmessage()"
                // id="dm${i}">${id}</button>`
                //     + document.getElementById('channels').innerHTML

                fetch("https://api.revolt.chat/users/" + id, {
                    "credentials": "omit",
                    "headers": {
                        "Accept": "*/*",
                        "x-session-token": thetoken
                    },
                    "method": "GET",
                }).then(response => response.json())
                    .then(data => qs(`#dm${i}`).textContent = (data.username))
            }
        } catch (error) {
            showError(error)
        }
    }
}

async function getserver(server) {
    qs("#selectServer").innerHTML =
        '<option value="Server" selected>Server</option>';
    for (let i = 0; i < server.length; i++) {
        qs("#selectServer").innerHTML +=
            `<option value="${server[i].name}" onclick="theserver = '${server[i]._id}';getchannel()"
            id="server${i}">${server[i].name}</option>`;
    }
}

async function getchannel() {
    qs("#selectChannel").innerHTML = '<option value="Channel" selected>Channel</option>';
    await fetch(`https://api.revolt.chat/servers/${theserver}/`, {
        "credentials": "omit",
        "headers": {
            "Accept": "*/*",
            "x-session-token": thetoken
        },
        "method": "GET",
    }).then(response => response.json())
        .then(data => chann = (data.channels))
    for (let i = 0; i < chann.length; i++) {
        qs("#selectChannel").innerHTML +=
            `<option onclick="thechannel = '${chann[i]}';
            clearmessages();
            getmessage();"
            id="chann${i}">${chann[i]}</option>`;
    }
    for (let i = 0; i < chann.length; i++) {
        fetch(`https://api.revolt.chat/channels/${chann[i]}/`, {
            "credentials": "omit",
            "headers": {
                "Accept": "*/*",
                "x-session-token": thetoken
            },
            "method": "GET",
        }).then(response => response.json())
            .then(data => {
                if (data.channel_type === "VoiceChannel") {
                    qs(`#chann${i}`).remove(); return;
                }
                qs(`#chann${i}`).innerText = data.name
            });
    }
}

async function parsemessage(message) {
    try {
        let username = ""
        let img = ""
        let replyinmsg = ""
        if (message.attachments) {
            image = message.attachments;
            img = `<br><a href="https://autumn.revolt.chat/attachments/${image[0]._id}/${image[0].filename}" target="_blank"><img src="https://autumn.revolt.chat/attachments/${image[0]._id}/${image[0].filename}"></a>`
        }
        if (message.replies) {
            if (messages.indexOf(!message.replies[0]._id) == -1) {
                await fetch(`https://api.revolt.chat/channels/${thechannel}/messages/${message.replies[0]}`, {
                    "credentials": "omit",
                    "headers": {
                        "Accept": "*/*",
                        "x-session-token": thetoken
                    },
                    "method": "GET",
                }).then(response => response.json())
                    .then(data => replyinmsg = ("> " + data.content))
            } else {
                replyinmsg = "> " + messcont[messages.indexOf(message.replies[0])]
            }
        }
        if (message.masquerade) {
            try {
                username = message.masquerade.name;
            } catch (error) { showError(JSON.stringify(message) + error) }
        } else if (uIDs.indexOf(message.author) === -1) {
            await fetch(`https://api.revolt.chat/users/${message.author}`, {
                "credentials": "omit",
                "headers": {
                    "Accept": "*/*",
                    "x-session-token": thetoken,
                    "Cache-Control": "private"
                },
                "method": "GET",
            }).then(response => response.json())
                .then(data => {
                    username = data.username
                    usernames.push(data.username)
                    uIDs.push(data._id)
                });
        } else {
            username = usernames[uIDs.indexOf(message.author)]
        }
        // if(message.reactions){
        //     console.log(message.reactions)
        //     for(let i=0;i<message.reactions.length;i++){
        //         console.log(message.reactions[i])
        //     }
        // }
        qs("#messages").innerHTML = qs("#messages").innerHTML + `
        <div class="messagecont" onclick="button=qs('#reply${message._id}'); if(button.hidden){button.hidden=false}else{button.hidden=true}">
            <div class="message">
                ${lastmessage != message.author ? `<h4 id="author">${escapeHTML(username)}</h4>` : ""}
                <p hidden="${qs('.replying-msg') != "" ? "true" : "false"}" id="replymsg">${escapeHTML(replyinmsg)}</p>
                <button hidden=true class="reply" id="reply${message._id}" onclick="
                reply='${message._id}';
                qs('.replying-cont').style.display = 'flex';
                qs('.replying-msg').textContent = '${escapeHTML(username)}: ${escapeHTML(message.content)}';">
                    reply</button>
                <p class="msg-content">${escapeHTML(message.content)}${img}</p>
            </div>
        </div>`
        messages.push(message._id);
        messcont.push(message.content)
        lastmessage = message.author
        autoScroll();
    } catch (error) { showError(error) }
}

async function getmessage() {
    fetch(`https://api.revolt.chat/channels/${thechannel}`, {
        "credentials": "omit",
        "headers": {
            "Accept": "*/*",
            "x-session-token": thetoken
        },
        "method": "GET",
    }).then(response => response.json())
        .then(data => {
            // if (data.channel_type == "DirectMessage") { document.getElementById("chanName").innerText = data.recipients[0] } else { document.querySelector("#channelName").textContent = data.name + "⌄"; }
            if (data.description) {
                qs(".channelDesc").textContent = data.description;
            } else {
                qs(".channelDesc").textContent = "No description";
            };
        })

    qs("#messages").innerHTML = "";
    await fetch(`https://api.revolt.chat/channels/${thechannel}/messages?include_users=true`, {
        "credentials": "omit",
        "headers": {
            "Accept": "*/*",
            "x-session-token": thetoken
        },
        "method": "GET",
    }).then(response => response.json())
        .then(data => {mess = (data.messages); users = (data.users)})

    for(let i=0;i<users.length;i++){
        console.log(users[i])
        if(uIDs.indexOf(users[i]._id) === -1){
            uIDs.push(users[i]._id)
            usernames.push(users[i].username)
        }
    }
    mess.reverse()
    for (let i = 1; i <= mess.length; i++) {
        await parsemessage(mess[i - 1])
    }
}

let fileInput = qs("#file");
fileInput.addEventListener("change", () => {
    qs(".file-count").style.display = "flex";
    qs(".file-name").textContent = fileInput.files[0].name + ` (${fileInput.files[0].size})`;
    autoScroll();
}, false);

qs(".cancel").addEventListener("click", resetFile, false);

function resetFile() {
    fileInput.value = "";
    qs(".file-count").style.display = "none";
    qs(".file-name").textContent = "";
    console.log(fileInput.files);
}

function revaSpeech(speech, link) {
    qs("#messages").innerHTML +=
        `<div class="messagecont">
            <div class="message">
                <h4 id="author" style="color: red;">Reva .\\ /.</h4>
                <p class="msg-content">${speech}</p>
            </div>
        </div>`;
    autoScroll();
}

function escapeHTML(s) {
    return s.replace(/&/, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/'/gm, '&apos;')
        .replace(/"/g, '&quot;')
        .replace(/\//g, '&sol;')
}

/* HATRED */
while (isLogged) {
    let time;
    const firewall = document.querySelector(".firewall");

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState == "visible") {
            firewall.style.display = "flex";
        }
    });

    firewall.addEventListener("mouseover", () => {
        time = setTimeout(() => {
            firewall.style.display = "none";
        }, 20.0 * 1000);
    }, false);

    firewall.addEventListener("mouseout", () => {
        clearTimeout(time);
    }, false);
}
