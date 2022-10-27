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
const revaPrompt = "< ";

if(localStorage.getItem("token") !=undefined){
            thetoken=localStorage.getItem("token");
            login();
}

async function login() {
    if (document.getElementById("token").value) {
        thetoken = document.getElementById("token").value;
        localStorage.setItem("token",thetoken)
    }
    bonfire()
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
    document.querySelector(".login-section").style.display = "none";
    document.getElementById("logged").hidden = false;
    document.getElementById("logged").style.display = "flex";
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
            console.log(JSON.stringify(data.servers))
            getserver(data.servers);
        }
    });

    socket.addEventListener('error', function (event) {
        connected = false;
        document.querySelector(".status").style.color = "red";
        showError("Disconnected")
    });

    socket.onclose = function (event) {
        connected = false;
        document.querySelector(".status").style.color = "red";
        showError("Disconnected")
    }
}

function ping() {
    socket.send('{"type":"Ping","data":0}');
    tm = setTimeout(async function () {
        connected = false;
        document.querySelector(".status").style.color = "red";
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
    document.getElementById("loginerror").innerText = error;
    document.querySelector(".reva-speech").textContent = revaPrompt + error;
    document.getElementById("loginerror").hidden = false;
    errortimeout = setTimeout(function () {
        document.querySelector(".reva-speech").textContent = "";
        document.getElementById('loginerror').hidden = true;
    }, 10000);
}

async function uploadToAutumn() {
    const files = document.getElementById("upload").files
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

document.getElementById("input").onkeypress = function (event) {
    if (event.keyCode == 13 || event.which == 13) {
        sendmessage();
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
    message = document.getElementById('input').value
    if (message.search(/ @[^ ]*/) != -1) {
        pings = /@[^ ]*/[Symbol.match](message)
        for (let i = 0; i < pings.length; i++) {
            message = message.replace(pings[i], `<@${uIDs[usernames.indexOf(pings[i].replace("@", ""))]}>`)
        }
    }
    if (!(embedSend || sendRawJson || reply != "" || document.getElementById("upload").files[0])) {
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
        document.getElementById("input").value = ""
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
            document.getElementById("input").value = "";
            reply = ""
            document.getElementById('replymsg').innerText = '';
            document.getElementById('replymsg').hidden = true
        } else {
            if (document.getElementById("upload").files[0]) {
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
                var file = document.getElementById("upload");
                file.value = file.defaultValue;
                image = ""
                document.getElementById("input").value = ""
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
                        "body": document.getElementById("input").value,
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
    document.getElementById('messages').innerHTML = '';
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
    document.getElementById('channels').innerHTML = "";
    for (let i = 0; i < dm.length; i++) {
        try {
            if (dm[i].channel_type == "Group") {
                document.getElementById('channels').innerHTML = `<button onclick="
                theserver='';
                clearmessages();
                thechannel = '${dm[i]._id}';
                getmessage()"
                id="dm${i}">${dm[i]["name"]}</button>`
                    + document.getElementById('channels').innerHTML
            } else {
                if (dm[i].recipients[0] == theuser._id) {
                    id = dm[i].recipients[1]
                } else {
                    id = dm[i].recipients[0]
                }
                document.getElementById('channels').innerHTML = `<button onclick="
                theserver='';
                clearmessages();
                thechannel = '${dm[i]._id}';
                getmessage()"
                id="dm${i}">${id}</button>`
                    + document.getElementById('channels').innerHTML

                fetch("https://api.revolt.chat/users/" + id, {
                    "credentials": "omit",
                    "headers": {
                        "Accept": "*/*",
                        "x-session-token": thetoken
                    },
                    "method": "GET",
                }).then(response => response.json())
                    .then(data => document.getElementById(`dm${i}`).innerText = (data.username))
            }
        } catch (error) {
            showError(error)
        }
    }
}

async function getserver(server) {
    for (let i = 0; i < server.length; i++) {
        document.querySelector("#selectServer").innerHTML +=
            `<option onclick="theserver = '${server[i]._id}';getchannel()"
            id="server${i}">${server[i].name}</option>`;
    }
}

async function getchannel() {
    // document.querySelector("#selectChannel").innerHTML = "";
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
        document.querySelector("#selectChannel").innerHTML +=
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
                    document.getElementById(`chann${i}`).remove(); return;
                }
                document.getElementById(`chann${i}`).innerText = data.name
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
            img = `<br><img src="https://autumn.revolt.chat/attachments/${image[0]._id}/${image[0].filename}">`
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
        if(message.reactions){
            console.log(message.reactions)
            for(let i=0;i<message.reactions.length;i++){
                console.log(message.reactions[i])
            }
        }
        document.getElementById("messages").innerHTML = document.getElementById("messages").innerHTML + `
        <div class="messagecont" onclick="button=document.getElementById('reply${message._id}'); if(button.hidden){button.hidden=false}else{button.hidden=true}">
            <div class="message">
                ${lastmessage != message.author ? `<h4 id="author">${username}</h4>` : ""}
                <p hidden="${replymsg != "" ? "true" : "false"}" id="replymsg">${replyinmsg}</p>
                <button hidden=true class="reply" id="reply${message._id}" onclick="
                reply='${message._id}';
                document.getElementById('replymsg').innerText='> ${message.content}';
                document.getElementById('replymsg').hidden=false">
                    reply</button>
                <p class="msg">${message.content}${img}</p>
            </div>
        </div>`
        messages.push(message._id);
        messcont.push(message.content)
        lastmessage = message.author
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
            if (data.channel_type == "DirectMessage") { document.getElementById("chanName").innerText = data.recipients[0] } else { document.querySelector("#channelName").textContent = data.name + "⌄"; }
            if (data.description) { document.querySelector(".channelDesc").textContent = data.description };
        })

    document.getElementById("messages").innerHTML = "";
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
