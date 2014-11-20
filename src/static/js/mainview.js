function isFromYoutube(url) {
  //  from  http://stackoverflow.com/a/10315969/624466
    var p = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
  return (url.match(p)) ? RegExp.$1 : false;
};

function isTitleChange(some_string) {
    var p = "(title:)(.*)"
    return (some_string.match(p)) ? RegExp.$2 : false
};
document.getElementById("input_url").onkeypress = function(e) {
    // http://stackoverflow.com/a/11365682/1663352
    if (!e) e = window.event;
    var keyCode = e.keyCode || e.which;
    if (keyCode == "13"){  // Enter key
        SubmitUrl()
    }
};

function SubmitUrl() {
    var url = document.getElementById("input_url").value;
    var striped_url = url.replace("m.","") //parry hack TODO: EDIT REGEX
    var id_ = isFromYoutube(striped_url);
    if (id_) {
        console.log("SUBMITTING",id_)
        ws.send(JSON.stringify({text:"ADD THIS SONG, CHEERS LAD",
                                 id : id_}))
    };
    var new_title = isTitleChange(url)
    if (new_title) {
        console.log("Updating title:",new_title)
        ws.send(JSON.stringify({text: "CHANGE THE TITLE",
                                title: new_title}))
    };
    document.getElementById("input_url").value = ""
};

// WHAT HAPPENED TO 1? (ITS IN THE HTML)
// 2. This code loads the IFrame Player API code asynchronously.
var tag = document.createElement('script');

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// 3. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
var player;
function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    height: '390',
    width: '640',
    videoId: '',
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
};

// 4. The API will call this function when the video player is ready.
function onPlayerReady(event) {
  event.target.playVideo();
};

// 5. The API calls this function when the player's state changes.
function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.ENDED){
        loadNextVideo()
  }
  // TODO: ADD SOMETHING IN SO THAT IF THE USER CLICKS ON A NEXT TRACK ON THE
  // PLAYER IT SENDS A NEW SONG MESSAGE TO THE SERVER
};

function loadNextVideo() {
    ws.send(JSON.stringify({"text":"SEND ME A NEW SONG"}))
};

function UpdatePlayList(data){
    var current_playlist = data["playlist"];
    window.document.title = data["title"];
    var playListDiv = document.getElementById("currently_playing")
    // Clear out the div before refilling it
    while (playListDiv.firstChild) {
		  playListDiv.removeChild(playListDiv.firstChild);
	}
   
    // Add the header div
    var plHead = playListDiv.appendChild(document.createElement("div"))
    plHead.className = "plHead"
    var header_items = ["plHeadNum","plHeadTitle","plHeadArtist","plHeadLength"]
    var header_text  = ["#", "Title", "Artist", "Length"]
    for (var i=0; i < header_items.length; i++) {
        var head_item = plHead.appendChild(document.createElement("div"));
        head_item.className = header_items[i];
        head_item.appendChild(document.createTextNode(header_text[i]));
    };

    // Add the list to hold the songs
    var play_list = playListDiv.appendChild(document.createElement("ul"));
    play_list.id = "plUL";
    var list_divs = ["plNum", "plTitle", "plArtist","plLength"];
    var list_data = ["postion","title","artist","duration"];
    for (var i=0; i < current_playlist.length; i++) {
        // Creates the list item
        var cur_item = current_playlist[i];
        var list_item = play_list.appendChild(document.createElement("li"));
        list_item.className = "plItem"
        // Adds the actual information
        for (var y=0; y < list_divs.length; y++) {
            var div_item =  list_item.appendChild(document.createElement("div"));
            // TODO: SORT OUT CSS
            // TODO: Zfill duration
            var text = (list_data[y] == "duration") ? Math.floor(cur_item["duration"] / 60) + ":"+ cur_item["duration"] % 60 : cur_item[list_data[y]]
            div_item.className = list_divs[y];
            div_item.appendChild(document.createTextNode(text));
        } 
        if (data.start) {
              if (player.getPlayerState() == -1 && cur_item["postion"] == 1 ) {
                  console.log("WE AINT PLAYING YET, lets get it started")
                  player.loadVideoById(cur_item["id"])
            } else if (player.getPlayerState() == 0 && cur_item["postion"] == 1 ) {
                console.log("STARTING A NEW TING")
                player.loadVideoById(cur_item["id"])
            }
        } else if (document.getElementById("player") != null) {
            var player_div = document.getElementById("player");
            player_div.parentNode.removeChild(player_div);
            // WANT TO HAVE MULTI PLAYER MODE FOR CROSS CONTINENT FUN
            //document.getElementById("player").style.display = 'none;';
        }
    };

};

window.onload = function() {
// THIS SEEMS HACKY TO DEAL WITH GETTING MESSAGE BEFORE PLAYER HAS LOADED
    var target = "ws://".concat(window.location.host).concat("/ws").concat(location.pathname)  // TODO: FIND OUT IF THIS IS THE RIGHT THING TO DO
    ws = new WebSocket(target)

    ws.keepAlive = function() {
        ws.send("don't forget me");
    };

    ws.onopen = function() {
        // SURE SHOULD NOT HAVE TO DO THIS, ENCODE HERE DECODE THERE DANCE
        var hello = JSON.stringify({text: "hello"});
        this.send(hello);
        console.log("SENT HELLO")

        //var interval = setInterval(this.keepAlive, 5000);
    };

    ws.onmessage = function(evt) {
        var new_config = JSON.parse(evt.data);
        UpdatePlayList(new_config)
    };

    ws.onclose = function() {
        // websocket is closed.
        alert("Connection is closed...");
};

};
