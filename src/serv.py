import logging
import tornado.escape
import tornado.ioloop
import tornado.options
import tornado.web
import tornado.websocket
from tornado.options import define, options
import os
import os.path
import uuid
import random
import json
import urllib2

# GLOBAL TINGS, SHOULD BE A DATABASE TODO: ADD DATABASE
clients = []
active_sessions = {}

class MusicSessionHolder(object):

    def __init__(self, new_id):
        self.session_id = new_id
        self.users = []
        self.watchers = []
        self.title = "TEST TEST TEST"
        self.playlist = []
        self.client_info = { "title" : self.title, "playlist" : self.playlist }

    def add_user(self, user):
        if len(self.users) < 1:
            logging.info("Adding main user to session {0}"
                            .format(self.session_id))
            self.users.append(user)
            user.player = True
        else:  # MAYBE WE SHOULDN'T JUST BE ACCEPTING EVERYONE?
            self.watchers.append(user)
            user.player = False

    def remove_user(self, user):
        if not user.player:
            self.watchers.remove(user)
        else:
            self.users.remove(user)
    def update_title(self, new_title):
        # TODO: FIND OUT HOW YOUR SUPPOSED TO ESCAPE THIS CORRECTLY
        if new_title:
            logging.info("Session {0} Updating title to {1}"
                            .format(self.session_id, new_title))
            self.client_info["title"] = new_title
            self.tell_everyone()

    def read_message(self, user, client_message):

        if user.player:
            if client_message["text"] == "SEND ME A NEW SONG":
                self.next_track()
            if client_message["text"] == "CHANGE THE TITLE":
                self.update_title(client_message["title"])

        if client_message["text"] == "ADD THIS SONG, CHEERS LAD":
            self.update_playlist(client_message)
        # TODO : DON'T SEND MESSAGE IF NOTHING HAPPENED
        self.tell_everyone()

    def update_playlist(self, client_message):
        new_song_id = client_message["id"]
        if any(item["id"] == new_song_id for item in self.playlist):
            return False
        logging.info("Adding {0} to session {1}"
                        .format(new_song_id, self.session_id))
        video_info = self.get_info_from_id(new_song_id)
        video_info["postion"] = len(self.playlist) + 1
        self.playlist.append(video_info)
        self.tell_everyone()

    def get_info_from_id(self, video_id):
        # Youtube api v2 is depreciated TODO: FIND ALT
        # DO I NEED TO ASYNC LOAD THIS PAGE? SHOULD I EVEN DO THIS? IT WORKS...
        url = "http://gdata.youtube.com/feeds/api/videos/"+video_id+"?v=2&alt=json"
        response = urllib2.urlopen(url)
        #TODO : SOME ERROR HANDLING, NOTHING HAS GONE WRONG YET HOWEVER
        data = json.load(response)
        return {
        "id"       : video_id,
        "title"    : data["entry"]["title"]["$t"],
        "artist"   : data["entry"]["author"][0]["name"]["$t"],
        "duration" : data["entry"]["media$group"]['media$content'][0]["duration"]
        }

    def tell_everyone(self):
        for user in self.users + self.watchers:
            self.client_info["start"] = user.player
            user.write_message(self.client_info)

    def next_track(self):

        logging.info("Session {0} requesting new track".format(self.session_id))
        if not self.playlist:
            return False
        self.playlist.reverse()
        self.playlist.pop()
        self.playlist.reverse()
        for song in self.playlist:
            song["postion"] = song["postion"] - 1
        self.tell_everyone()


def get_new_session_id():
    new_id = str(random.randint(100000000, 999999999))
    if active_sessions.get(new_id, None):
        return get_new_session_id()
    return 1 # new_id


class Application(tornado.web.Application):
    def __init__(self):

        settings = dict(
            template_path=os.path.join(os.path.dirname(__file__), "templates"),
            static_path=os.path.join(os.path.dirname(__file__), "static"),
            xsrf_cookies=False,
        )
        handlers = [
            (r"/", IndexHandler),
            (r"/([0-9]+)", MainHandler),
            (r"/newsession", NewSessionHandler),
            (r"/ws/([0-9]+)", UserHandler),
            (r"/img/(.*)",tornado.web.StaticFileHandler,
            {"path": "".join((settings["static_path"],"/img"))},),
        ]
        tornado.web.Application.__init__(self, handlers, **settings)

class IndexHandler(tornado.web.RequestHandler):
    def get(self):
        self.render("index.html")

class NewSessionHandler(tornado.web.RequestHandler):
    def get(self, *args, **kwargs):
        new_session_id = get_new_session_id()
        active_sessions[str(new_session_id)] = MusicSessionHolder(new_session_id)
        self.redirect("/{0}".format(new_session_id))

class MainHandler(tornado.web.RequestHandler):
    def get(self, *args, **kwargs):
        if active_sessions.get(self.request.uri[1:]):
            self.render("main.html")

        else:  # Otherwise send them back to the start
            self.redirect(r"/")

class UserHandler(tornado.websocket.WebSocketHandler):

    def __init__(self, *args, **kwargs):
        super(UserHandler, self).__init__(*args, **kwargs)
        # SHOULD THIS BE DONE ON OPEN OR IS IT FINE HERE? DOES IT MATTER?
        session_id = self.request.uri[4:] # cut of the /ws/ #TODO: BE SMARTER
        target_session = active_sessions[session_id]  # COULD BREAK SHOULDNT
        target_session.add_user(self)
        self.session = target_session

    def open(self, *args, **kwargs):
        if self not in clients:
            clients.append(self)

    def on_message(self, message):
        client_msg = json.loads(message)
        self.session.read_message(self, client_msg)

    def on_close(self):
        clients.remove(self)
        self.session.remove_user(self)


def main():
    tornado.options.parse_command_line()
    app = Application()
    port = int(os.environ.get("PORT", 8888))
    app.listen(port)
    tornado.ioloop.IOLoop.instance().start()

if __name__ == "__main__":
    main()
