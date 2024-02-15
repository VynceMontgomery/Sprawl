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
    board.appearance({ render: () => null});

    board.first('land').appearance({
      render: () => 
        <div className="banner">
          <h1>Sprawl</h1>
          <h2 className="tagline">A Land Grab Game</h2>
        </div>
      // (a) this doesn't look right, as is and (b) this keeps plot info from working (layering order?)
      // so, TODO: fix that. 
      // possibly replace with some sortof credits / full page scrollable rulebook? 
      // , info: () => 
      // <div>
      //   <p>Sprawl is a game about claiming land and putting it to use.</p>
      //   <p>On each turn, you will add a die to your cup, then roll the dice in your cup. 
      //     You'll choose one result and place all copies of it on the board. 
      //     Each result represents a different kind of building or event, 
      //     which each have their own placement and scoring rules.</p>
      //   <p> Learn more from the rulebook... once I post one.</p>
      // </div>
    });

    board.layout(Space, {
      gap: 1,
      margin: 1,
    });

    board.all(Space).layout(Die, {
      aspectRatio: 1,
      gap: 0.5,
      margin: 1,
    });

    board.all(Space, {name: 'plot'}).layout(Die, {
      gap: 1,
      margin: 1.5,
    });

    // board.all(Space, {name: 'land'}).appearance({
    //   aspectRatio: 1,
    //   left: 25,
    //   width: 75,
    // });

    board.layout('land', {
      aspectRatio: 1,
      alignment: "top right",
      area: {
        top: 0,
        height: 100,
        left: 0,
        width: 65,
      },
      // showBoundingBox: true,
    });

    board.all('land').layout('plot', {
      aspectRatio: 1,
      area: {
        top: 30,
        height: 100,
        left: 0,
        width: 100,
      },
      // showBoundingBox: true,
    });

    board.layout('players', {
      aspectRatio: 1/3,
      area: {
        top: 0,
        height: 100,
        left: 65,
        width: 35,
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
        left: 35,
        top: 20,
        height: 45,
        width: 65,
      },
    });

    board.all(Space, {name: 'zone'}).layout("cup", {
      aspectRatio: 5/7,
      area: {
        left: 5,
        top: 60,
        height: 35,
        width: 25,
      },
    });

    board.all(Space, {name: 'cup'}).layout(Die, {
      aspectRatio: 1,
      gap: 0.5,
      margin: 0.5,
      haphazardly: 0.1,
      alignment: "bottom left",
    });

    board.all(Space, {name: 'zone'}).layout("reserve", {
      // aspectRatio: 3/2,
      area: {
        left: 35,
        top: 70,
        height: 25,
        width: 60,
      },
    });

    board.all(Space, {name: 'zone'}).appearance({
      render: zone => (
        <div className="playerZone">
          <ProfileBadge player={zone.player!}/>
          <div className="score">{zone.player!.score}</div>
        </div>
      )
    });

    board.all('cup').appearance({
      info: (cup) => {
        const count = cup.all(Die).length;
        const rescount = cup.player.my('reserve').all(Die).length;
        return (
          <div>
            This is {cup.player.name}'s dice cup. 
            It has { count } { count === 1 ? 'die' :'dice' } in it.
            { count === 0 && rescount === 0 ? `All their dice are placed. If that's still true when their turn starts, the game ends.` : ''}
          </div>
        )},
    })

    board.all('reserve').appearance({
      info: (reserve) => {
        const count = reserve.all(Die).length;
        const cupcount = reserve.player.my('cup').all(Die).length;
        return (
          <div>
            This is {reserve.player.name}'s reserve. 
            It has { count } { count === 1 ? 'die' :'dice' } in it.
            { count < 2 ? `The game may be almost over.` :''}
            { count === 0 && cupcount === 0 ? `All their dice are placed. If that's still true when their turn starts, the game ends.` : ''}
          </div>
        )},
    })

    board.all(Plot).appearance({
      render: plot => {
        if (plot.blocker) { return (
          <div className="blocker">
            {
            (plot.blocker === 'orthogonal') 
              ? 'Orthogonal'
            : ((plot.blocker === 'not orthogonal')
              ? 'Not orthogonal'
            : `Blocked by a ${ plot.blocker?.current }`)
            }
          </div>
        )}
      },
      info: plot => {
        if (plot.row === 6 && plot.column === 9) {
        //   console.log(plot.claimCache);
          console.log("plain: ", plot.claimsAgainst());
          console.log("forced: ", plot.claimsAgainst(true));
        //   console.log(plot.claimCache);
        }

        if (plot.has(Die)) {
          const d = plot.first(Die);
          return (
            <>
            <div>
              This plot is occupied by { d.player.name }'s { d.noun() }.
              { [3, 6].includes(d.current) ?
                (d.twisted 
                  ? ' Because it is twisted, it runs ' 
                  + ( d.current === 6 ? 'East-West ' : 'Northeast-Southwest ')
                  : " It runs "
                  + ( d.current === 6 ? 'North-South ' : 'Northwest-Southeast ') ) 
                + ' and blocks the next plot in each of those directions.'
              : ''}
            </div>
            <div>
              {d.noun()}s score { // <-- ucfirst that, maybe also big bold it? 
                d.current === 1 
                ? ` nothing, but they hold the space for you to build on later.`
                : d.current === 6
                ? ` one point for each adjacent, non-${d.noun()} die belonging to the same player.`
                : ` their face value (${ d.current }).`
              }
              { (d.current === 2
                ? ` In addition, there is a bonus of one point for each opponent die that touches any number of your ${ d.noun() }s. `
                : d.current === 3 
                ? ` In addition, there is a bonus of one point for each field - beloning to any player - that touches any number of your ${ d.noun() }s. `
                : '')
              }
            </div>
            </>
          );
        } else { return (
          <div>
            This plot is empty.
            { plot.claimsAgainst()?.length ? ` Placement here may be affeced by these nearby claims: ` 
              + plot.claimsAgainst()?.map((c) => c.player.name + "'s " + c.noun()).join(', ')
              :''}
          </div>
        )}
      },
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
