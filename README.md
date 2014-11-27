youChoose
=========

A [Tornado](http://www.tornadoweb.org/en/stable/) web server for the creation of temporary youtube playlists using websockets. 

Currently to run, clone the repo and cd in to the `src` directory then:

    python serv.py
    
This will create a new service running on port 8888, point your browser at `http://localhost:8888` and you will be greated by the index page. Start a new session by clicking the button, then you can add new songs to the playlist by pasting the YouTube URL into the input box and pressing enter or the submit button.


##Current Goals

* Allow multiple players to be sync'd up. (Think people in different places, rather than the same room)
* Voting to delete, move/down que, next song
* Better view on moblie platforms, currently doesn't look great on moblies.
* Database to back up sessions / playlists for retrival later
* Cull sessions with no users or songs left to play
