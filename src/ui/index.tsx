import React from 'react';
import { render, choiceSetting, ProfileBadge } from '@boardzilla/core';
import { default as setup, Space } from '../game/index.js';

import './style.scss';
import '@boardzilla/core/index.css';

render(setup, {
  settings: {
    gameLength: choiceSetting('Length of Game', ['Normal', 'Shorter', 'Longer']),
  },
  layout: board => {
    board.appearance({
      render: () => null
    });

    board.layout(Space, {
      gap: 1,
      margin: 1
    });

    board.all(Space).layout(Die, {
      gap: 0.5, 
      margin: 1,
    });

    board.all(Space, {name: 'plot'}).layout(Die, {
      gap: 1, 
      margin: 1,
    });


    // board.all(Space, {name: 'land'}).appearance({
    //   aspectRatio: 1,
    //   left: 25,
    //   width: 75,
    // });

    board.layout('land', {
      aspectRatio: 1,
      area: {
        left: 0,
        top: 0,
        width: 65,
        height: 65,
      },
      // showBoundingBox: true,
    });

    board.layout('players', {
      aspectRatio: 1/3,
      area: {
        top: 0,
        left: 65,
        width: 35,
        height: 100,
      },
    });

    board.all(Space, {name: 'players'}).layout("zone", {
      gap: 2, 
      margin: 2,
      aspectRatio: 1,
      columns:1, 
      alignment: "top left",
    });

    board.all(Space, {name: 'zone'}).layout("roll", {
      aspectRatio: 1,
      area: {
        left: 40,
        top: 15,
        height: 60,
        width: 60,
      },
    });

    board.all(Space, {name: 'zone'}).layout("cup", {
      aspectRatio: 5/7,
      area: {
        left: 10,
        top: 60,
        height: 35,
        width: 25,
      },
    });

    board.all(Space, {name: 'zone'}).layout("reserve", {
      aspectRatio: 3/2,
      area: {
        left: 40,
        top: 70,
        height: 25,
        width: 55,
      },
    });

    board.all(Space, {name: 'zone'}).appearance({
      // aspectRatio: 3/2,

      render: zone => (
        <div class="playerZone">
          <ProfileBadge player={zone.player!}/>
          <div className="score">{zone.player!.score}</div>
        </div>
      )
    });

    board.all(Space, (p) => p.name === 'plot' &&  ((p.row + p.column) % 2)).forEach((p) => p.gridparity = 'odd');
    board.all(Space, (p) => p.name === 'plot' && !((p.row + p.column) % 2)).forEach((p) => p.gridparity = 'even');

    board.all(SprawlDie).appearance({
      className: 'Die'
    });
  },

  announcements: {
    EndGame: board => (
        <div>
        <p>Entering the end game. At least one player is now rolling all their dice.</p>
        </div>
      ),
    LastTurn: board => (
        <div>
        <p>{board.first(Space, (r) => (r.name === 'reserve' && !r.has(Die))).player.name} has placed their last die. This may be your last turn.</p>
        </div>
      )
  }
});
