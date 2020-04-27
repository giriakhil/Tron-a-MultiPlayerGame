(
  document.onreadystatechange = () => {
    if (document.readyState === 'complete') {
      const gameMusic = new Audio('static/assets/music.mp3');
      gameMusic.loop = true;
      gameMusic.play();
      const gameGrid = {};
      for (i = 0; i < 15; i += 1) {
        for (j = 0; j < 15; j += 1) {
          gameGrid[`${i},${j}`] = '';
        }
      }
      const model = {
        musicPlaying: true,
        playerName: '',
        playerFace: '',
        playerPosition: [0, 0],
        players: {},
        gameID: '',
        gameStatus: '',
        gameGrid,
        playerPath: new Set(),
      };
      const navView = {
        musicControl: document.getElementById('game-music'),
        render() {
          if (model.musicPlaying) {
            this.musicControl.innerHTML = `
              <span class="icon is-small">
                <i class="fas fa-volume-mute"></i>
              </span>
            `;
          } else {
            this.musicControl.innerHTML = `
              <span class="icon is-small">
                <i class="fas fa-volume-up"></i>
              </span>
            `;
          }
        },
        init() {
          this.musicControl.onclick = controller.toggleMusic;
          navView.render();
        },
      };
      const startView = {
        createGameControl: document.getElementById('create-game'),
        joinGameControl: document.getElementById('join-game'),
        welcomePlayerMessage: document.getElementById('welcome-player'),
        playerFace: document.getElementById('player-face'),
        gameID: document.getElementById('game-id'),
        init() {
          this.createGameControl.onclick = () => {
            controller.toggleView('start-screen', 'create-screen');
            createView.render();
            const params = new URLSearchParams();
            params.append('playername', model.playerName);
            params.append('playerphoto', model.playerFace);
            axios.post('/game-id', params, {
              'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
              }
            })
              .then((res) => {
                controller.setGameID(res.data);
                const eventSource = new EventSource(`/stream/${model.gameID}`);
                eventSource.onmessage = controller.handleGameStatus;
              })
              .catch((err) => {
                alert(err);
              });
          };
          this.gameID.onkeyup = (evt) => {
            if (evt.key === 'Enter') {
              const params = new URLSearchParams();
              params.append('playername', model.playerName);
              params.append('playerphoto', model.playerFace);
              params.append('gameid', this.gameID.value);
              axios.post('/join-game', params, {
                'headers': {
                  'Content-Type': 'application/x-www-form-urlencoded',
                }
              })
                .then((res) => {
                  if (res.data === 'Succesful') {
                    controller.setGameID(this.gameID.value);
                    controller.toggleView('start-screen', 'join-screen');
                    const eventSource = new EventSource(`/stream/${model.gameID}`);
                    eventSource.onmessage = controller.handleGameStatus;
                  }
                })
                .catch((err) => {
                  alert(res.data);
                });
            }
          };
          axios.get('/name')
            .then((res) => {
              controller.setPlayerName(res.data);
            })
            .catch((err) => {
              alert(err);
            });
          axios.get('/face')
            .then((res) => {
              controller.setPlayerFace(res.data);
            })
            .catch((err) => {
              alert(err);
            });
          this.render();
        },
        render() {
          this.welcomePlayerMessage.innerHTML = `Welcome ${model.playerName}`;
          this.playerFace.src = `data:image/png;base64,${model.playerFace}`;
        },
      };
      const createView = {
        startGameControl: document.getElementById('start-game'),
        playerPhotos: document.getElementById('player-photos'),
        gameShareLink: document.getElementById('game-share-link'),
        init() {
          this.startGameControl.onclick = () => {
            const params = new URLSearchParams();
            params.append('gameid', model.gameID);
            axios.post('/start-game', params, {
              'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
              }
            })
              .then(() => {
              })
              .catch((err) => {
                alert(err);
              });
          };
          this.render();
        },
        render() {
          this.playerPhotos.innerHTML = '';
          for (player in model.players) {
            const playerface = document.createElement('img');
            playerface.src = `data:image/png;base64,${model.players[player].face}`;
            playerface.style.width = '64px';
            playerface.style.height = '64px';
            document.getElementById('player-photos').appendChild(playerface);
          }
          this.gameShareLink.innerHTML = `${model.gameID}`;
        },
      };
      const gameView = {
        gameGrid: document.getElementById('game-grid'),
        players: document.getElementById('players'),
        init() {
          const params = new URLSearchParams();
          params.append('playername', model.playerName);
          params.append('gameid', model.gameID);
          axios.post('/random-position', params, {
            'headers': {
              'Content-Type': 'application/x-www-form-urlencoded',
            }
          })
            .then((res) => {
              let [x, y] = res.data.split(',');
              x = Number(x);
              y = Number(y);
              controller.setPlayerPosition([x, y]);
              gameView.render();
            })
            .catch((err) => {
              alert(err);
            });
          window.onkeyup = (evt) => {
            if ((evt.key === 'W' || evt.key === 'w' || evt.key === 'ArrowUp')
                && model.players[model.playerName].direction !== 'down') {
              controller.updateDirection('up');
            } else if ((evt.key === 'S' || evt.key === 's' || evt.key === 'ArrowDown')
                && model.players[model.playerName].direction !== 'up') {
              controller.updateDirection('down');
            } else if ((evt.key === 'A' || evt.key === 'a' || evt.key === 'ArrowLeft')
                && model.players[model.playerName].direction !== 'right') {
              controller.updateDirection('left');
            } else if ((evt.key === 'D' || evt.key === 'd' || evt.key === 'ArrowRight')
                && model.players[model.playerName].direction !== 'left') {
              controller.updateDirection('right');
            }
          }
        },
        animate(px, py, cycles, context, faceContext, direction, player) {
          cycles += 1;
          if (cycles < 36) {
            context.beginPath();
            const initial_x = px;
            const initial_y = py;
            context.moveTo(initial_y, initial_x);
            let [final_y, final_x] = [initial_y, initial_x];
            if (direction === 'left') {
              final_y -= 1;
            } else if (direction === 'right') {
              final_y += 1;
            } else if (direction === 'down') {
              final_x += 1;
            } else if (direction === 'up') {
              final_x -= 1;
            }
            context.lineTo(final_y, final_x);
            faceContext.clearRect(0, 0, 540, 540);
            faceContext.drawImage(model.players[player].img, final_y - 18, final_x - 18, 36, 36);
            context.stroke();
            setTimeout(() => {
              gameView.animate(final_x, final_y, cycles, context, faceContext, direction, player);
            }, 6);
          } else {
            controller.updatePosition(model.players[model.playerName]["direction"]);
          }
        },
        render() {
          this.players.innerHTML = '';
          for (player in model.players) {
            if (player in model.players && model.players[player] === 'died') {
              continue;
            }
            const img = document.createElement('img');
            img.src = `data:image/png;base64,${model.players[player].face}`;
            img.style.height = "32px";
            img.style.width = "32px";
            if (model.players[player]["previous_position"]) {
              const canvas = document.getElementById(player);
              const context = canvas.getContext('2d');
              const faceCanvas = document.getElementById(player + 'face');
              const faceContext = faceCanvas.getContext('2d');
              this.gameGrid
                .children[model.players[player]["previous_position"][0]]
                .children[model.players[player]["previous_position"][1]]
                .innerHTML = '';
              context.lineWidth = 4;
              context.shadowBlur = 8;
              context.shadowColor = "cyan";
              context.strokeStyle = 'black';
              context.lineCap = 'round';
              const [cx, cy] = model.players[player]["current_position"];
              let [nx, ny] = [cx, cy];
              const direction = model.players[player]["direction"];
              let cycles = 0;
              if (!model.players[player].animating) {
                controller.toggleAnimation(player);
                setTimeout(() => {
                  this.animate(cx * 36 + 18, cy * 36 + 18, cycles, context, faceContext, direction, player);
                }, 6);
              }
            }
            const playerImg = document.createElement('img');
            playerImg.src = `data:image/png;base64,${model.players[player].face}`;
            playerImg.style.height = "32px";
            playerImg.style.width = "32px";
            this.players.appendChild(playerImg);
            this.players.innerHTML += model.players[player]["direction"];
          }
        },
      };
      const controller = {
        init() {
          navView.init();
          startView.init();
          createView.init();
        },
        toggleView(fromViewID, toViewID) {
          const fromView = document.getElementById(fromViewID);
          const toView = document.getElementById(toViewID);
          fromView.classList.add('hide');
          toView.classList.remove('hide');
        },
        toggleMusic() {
          if (model.musicPlaying) {
            gameMusic.pause();
          } else {
            gameMusic.play();
          }
          model.musicPlaying = !model.musicPlaying;
          navView.render();
        },
        toggleAnimation(player) {
          model.players[player].animating = !model.players[player].animating;
        },
        setPlayerName(name) {
          model.playerName = name;
          startView.render();
          if (model.playerFace) {
            controller.addPlayer(model.playerName, model.playerFace);
          }
        },
        setPlayerFace(face) {
          model.playerFace = face;
          startView.render();
          if (model.playerName) {
            controller.addPlayer(model.playerName, model.playerFace);
          }
        },
        setPlayerPosition(position) {
          model.playerPosition = position;
        },
        setGameID(id) {
          model.gameID = id;
          createView.render();
        },
        updateDirection(direction) {
          const params = new URLSearchParams();
          params.append('playername', model.playerName);
          params.append('gameid', model.gameID);
          params.append('direction', direction);
          axios.post('update-direction', params, {
            'headers': {
              'Content-Type': 'application/x-www-form-urlencoded',
            }
          })
            .then(() => {})
            .catch((err) => {
              alert(err);
            })
        },
        updatePosition(move) {
          const params = new URLSearchParams();
          params.append('playername', model.playerName);
          params.append('gameid', model.gameID);
          params.append('move', move);
          axios.post('update-position', params, {
            'headers': {
              'Content-Type': 'application/x-www-form-urlencoded',
            }
          })
            .then(() => {
              controller.toggleAnimation(model.playerName);
            })
            .catch((err) => {
              alert(err);
            })
        },
        handlePlayerFace(gameID, playerName) {
          axios.get(`/player-face/${gameID}/${playerName}`)
            .then((res) => {
              model.players[playerName].face = res.data;
              const img = document.createElement('img');
              img.src = `data:image/png;base64,${model.players[player].face}`;
              model.players[playerName].img = img;
              createView.render();
            })
            .catch((err) => {
              alert(err);
            });
        },
        killPlayer(player) {
          model.players[player] = 'died';
          // for (let i = 0; i < 15; i += 1) {
          //   for (let j = 0; j < 15; j += 1) {
          //     if (model.gameGrid[`${i},${j}`] === player) {
          //       model.gameGrid[`${i},${j}`] = '';
          //       gameView.gameGrid
          //       .children[i]
          //       .children[j]
          //       .innerHTML = '';
          //     }
          //   }
          // }
          const canvas = document.getElementById(player);
          gameView.gameGrid.removeChild(canvas);
        },
        detectCollisions(x, y, player) {
          // boundary
          if (x < 0 || x > 14 || y < 0 || y > 14) {
            return true;
          }
          // light collision
          if ("current_position" in model.players[player]) {
            let [cx, cy] = model.players[player]["current_position"];
            if (model.gameGrid[`${x},${y}`] && !(cx === x && cy === y)) {
              return true;
            }
          }
          return false;
        },
        handleGameStatus(evt) {
          const gameData = JSON.parse(evt.data);
          for (player in gameData['players']) {
            if (player in model.players && model.players[player] === 'died') {
              continue;
            }
            if (player in model.players && model.gameStatus === 'started') {
              const [x, y] = gameData['players'][player]["current_position"];
              if (controller.detectCollisions(x, y, player)) {
                controller.killPlayer(player);
                if (player === model.playerName) {
                  const params = new URLSearchParams();
                  params.append('playername', model.playerName);
                  params.append('gameid', model.gameID);
                  axios.post('kill-player', params, {
                    'headers': {
                      'Content-Type': 'application/x-www-form-urlencoded',
                    }
                  })
                    .then(() => {
                      alert('You died');
                    })
                    .catch((err) => {
                      alert(err);
                    })
                }
              } else if (!model.players[player].animating) {
                model.players[player]["direction"] = gameData['players'][player]["direction"];
                model.players[player]["previous_position"] = model.players[player]["current_position"];
                model.players[player]["current_position"] = gameData['players'][player]["current_position"];
                model.gameGrid[`${x},${y}`] = player;
              }
            } else if (!(player in model.players)) {
              model.players[player] = gameData['players'][player];
              controller.handlePlayerFace(model.gameID, player);
            }
            if (player in model.players && model.players[player] !== 'died'
                && !(model.players[player].hasOwnProperty('canvas'))) {
              const canvas = document.createElement('canvas');
              canvas.classList.add('player-canvas');
              canvas.id = player;
              canvas.width = 540;
              canvas.height = 540;
              gameView.gameGrid.appendChild(canvas);
              const context = canvas.getContext('2d');
              const faceCanvas = document.createElement('canvas');
              faceCanvas.classList.add('player-canvas');
              faceCanvas.id = player + 'face';
              faceCanvas.width = 540;
              faceCanvas.height = 540;
              gameView.gameGrid.appendChild(faceCanvas);
              const faceContext = canvas.getContext('2d');
              model.players[player].canvas = canvas;
              model.players[player].context = context;
              model.players[player].faceCanvas = faceCanvas;
              model.players[player].faceContext = faceContext;
              model.players[player].animating = false;
            }
          }
          if (gameData.status === 'started' && model.gameStatus !== 'started') {
            if (gameData['started_by'] === model.playerName) {
              controller.toggleView('create-screen', 'game-screen');
            } else {
              controller.toggleView('join-screen', 'game-screen');
            }
            gameView.init();
            model.gameStatus = 'started';
          }
          if (model.gameStatus === 'started') {
            gameView.render();
          }
        },
        addPlayer(name, face) {
          model.players[name] = {
            face,
          };
          const playerImg = document.createElement('img');
          playerImg.src = `data:image/png;base64,${face}`;
          model.players[name].img = playerImg;
        },
      };
      controller.init();
    }
  }
)();