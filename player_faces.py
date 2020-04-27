import os
import base64

PLAYER_FACES_FOLDER = 'D:\\tron-final3\\static\\assets\\player_faces'

player_file_names = os.listdir(PLAYER_FACES_FOLDER)

player_images = []

for player_file in player_file_names:
  player_file = open(os.path.join(PLAYER_FACES_FOLDER, player_file), 'rb').read()
  player_images.append(base64.b64encode(player_file))
