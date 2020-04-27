from flask import Flask, render_template, request, json, Response
import names
import random
import player_faces
import uuid
import time

app = Flask(__name__)

games = {}

@app.route('/')
def hello():
    return render_template('index.html')


@app.route('/name')
def player_request():
    return random.choice(names.ADJECTIVES) + ' ' + random.choice(names.NOUNS)

@app.route('/face')
def face_request():
    return random.choice(player_faces.player_images)

@app.route('/game-id', methods=['POST'])
def game_request():
    game_id = str(uuid.uuid4()).split('-')[0]
    player_name = request.form.get('playername')
    player_photo = request.form.get('playerphoto')
    games[game_id] = {
      "players": {
        player_name: {
          "photo": player_photo,
          "direction": '',
          "current_position": (0, 0)
        }
      },
      "started_by": player_name
    }
    return game_id

@app.route('/start-game', methods=['POST'])
def start_game():
  game_id = request.form.get('gameid')
  if game_id in games:
    games[game_id]['status'] = 'started'
    return 'started'

@app.route('/player-face/<gameid>/<playername>')
def player_face_request(gameid, playername):
  if gameid in games:
    return games[gameid]["players"][playername]["photo"]

@app.route('/join-game', methods=['POST'])
def join_game():
    game_id = request.form.get('gameid')
    if game_id in games:
      game_id = request.form.get('gameid')
      player_name = request.form.get('playername')
      player_face = request.form.get('playerphoto')
      games[game_id]["players"][player_name] = {
        "photo": player_face,
        "direction": '',
        "current_position": (0, 0)
      }
      return 'Succesful'
    return 'no game exists'

@app.route('/random-position', methods=['POST'])
def random_position():
    game_id = request.form.get('gameid')
    player_name = request.form.get('playername')
    if game_id in games:
      x = random.randint(4, 10)
      y = random.randint(4, 10)
      random_direction = random.choice(['up', 'down', 'left', 'right'])
      games[game_id]["players"][player_name]["current_position"] = (x, y)
      games[game_id]["players"][player_name]["direction"] = random_direction
      return f'{x}, {y}'
    return 'no game exists'

@app.route('/update-direction', methods=['POST'])
def update_direction():
    game_id = request.form.get('gameid')
    player_name = request.form.get('playername')
    direction = request.form.get('direction')
    if game_id in games:
      games[game_id]["players"][player_name]["direction"] = direction
      return ''
    return ''

@app.route('/kill-player', methods=['POST'])
def kill_player():
    game_id = request.form.get('gameid')
    player_name = request.form.get('playername')
    if game_id in games:
      del games[game_id]["players"][player_name]
      return ''
    return ''

@app.route('/update-position', methods=['POST'])
def update_position():
    game_id = request.form.get('gameid')
    player_name = request.form.get('playername')
    move = request.form.get('move')
    if game_id in games:
      x, y = games[game_id]["players"][player_name]["current_position"]
      if move == 'left':
        y = y - 1
      elif move == 'right':
        y = y + 1
      elif move == 'down':
        x = x + 1
      elif move == 'up':
        x = x - 1
      games[game_id]["players"][player_name]["current_position"] = (x, y)
      games[game_id]["players"][player_name]["direction"] = move
      return f'{x}, {y}'
    return 'no game exists'

def eventStream(gameid):
    while True:
      if gameid in games:
        game_data = {
          "gameid": gameid,
          "players": {},
          "status": "",
          "started_by": games[gameid]['started_by']
        }
        for player_name in games[gameid]['players']:
          direction = games[gameid]['players'][player_name]['direction']
          current_position = games[gameid]['players'][player_name]['current_position']
          game_data["players"][player_name] = {
            "direction": direction,
            "current_position": current_position
          }
        if 'status' in games[gameid]:
          game_data['status'] = games[gameid]['status']
        game_data = json.dumps(game_data)
        yield f'data: {game_data} \n\n'
        time.sleep(0.5)

@app.route('/stream/<gameid>')
def stream(gameid):
    return Response(eventStream(gameid), mimetype="text/event-stream")


app.run('0.0.0.0', debug=True)
