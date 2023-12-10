# Snowball Showdown

## Overview
Snowball Showdown is a holiday-themed free-for-all game, inspired by popular multiplayer first-person shooter games. Players take on the roles of snowmen, engaging in playful snowball fights in a winter wonderland. The simplicity of the snowman models and snowballs ensures fast and accessible gameplay, suitable for a wide range of devices.

## Graphics

The game features several graphical enhancements to create an immersive and visually appealing experience:

* Particle Effects:
    * Snowball Explosion: Upon collision, snowballs appear to explode. This is achieved through a custom shader that pushes each triangle out along its normal, creating the illusion of an explosion, before despawning the snowball.
    * Snowfall: Triangles representing snowflakes fall from the sky, disappearing upon reaching the ground. Particle movement is handled in the shader for efficiency.
* Textures:
    * Simple texture maps are applied to various elements (e.g., floor, snowball) to give them a snowy appearance.
    * Bump mapping is used on map components like the floor to provide an illusion of depth without complicating collision detection.
* Shadows:
    * Shadows are implemented for map components to enhance the depth perception within the game arena.
* Models:
    * The game includes third-party snowman models and custom snowball models.

## Interactivity
* Movement: Players can move using WASD keys.
* View Control: First-person XY looking, allowing players to aim and navigate effectively.
* Environment: The game features walls and platforms, adding complexity and strategy to gameplay.
* Enemy Interpolation: Smooths player movement between server updates making game more fluid. 


## Controls

```wasd``` - movemend

```space``` - jump

```q``` - open menu

```e``` - zoom in/out

```left click``` -  fire snowball


## Web Server
* Manages registration of connected players.
* Maintains and records the game state.
* Maintains and updates leaderboard.

## Technologies Used
* Backend: Go websocket server
* Frontend: JavaScript (tiny-graphics), HTML/CSS, WebSockets for Real-time Communication

## Setup and Installation

```bash
git clone https://github.com/Emmettlsc/Snowball-Showdown
cd Snowball-Showdown
```
### View Frontend
```bash
python server.py
```
Then navigate to ```http://localhost:8001/```

### Backend
Prerequisite: Install [Go](https://go.dev/doc/install)
```bash
go run cmd/server/main.go 
```
