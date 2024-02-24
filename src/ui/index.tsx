import React from 'react';
import { render, choiceSetting, ProfileBadge } from '@boardzilla/core';
import { default as setup, Plot, Space, SprawlDie } from '../game/index.js';

import './style.scss';
import '@boardzilla/core/index.css';

render(setup, {
  settings: {
    gameLength: choiceSetting('Length of Game', {'normal': 'Normal', 'shorter': 'Shorter', 'longer': 'Longer'}),
  },
  layout: board => {
    board.appearance({ render: () => null});

    board.all('banner').appearance({
      render: () => 
        <div className="banner">
          <h1>Sprawl</h1>
          <h2 className="tagline">A Land Grab Game</h2>
        </div>,
      // (a) this doesn't look right, as is and (b) this keeps plot info from working (layering order?)
      // so, TODO: fix that. 
      // possibly replace with some sortof credits / full page scrollable rulebook? 
      info: () =>
      <div>
        <div>Sprawl is a game about claiming land and putting it to use.</div>
        <div>On each turn, you will add a die to your cup, then roll the dice in your cup.
          You'll choose one result and place all copies of it on the board.
          Each result represents a different kind of building or event,
          which each have their own placement and scoring rules.</div>
        <div> Learn more from the rulebook... once I post one.</div>
      </div>
    });

    board.layout(Space, {
      gap: 1,
      margin: 1,
    });

    board.all(Space).layout(SprawlDie, {
      aspectRatio: 1,
      gap: 0.5,
      margin: 1,
    });

    board.all(Space, {name: 'plot'}).layout(SprawlDie, {
      gap: 1,
      margin: 1.5,
    });

    // board.all(Space, {name: 'land'}).appearance({
    //   aspectRatio: 1,
    //   left: 25,
    //   width: 75,
    // });

    board.layout('banner', {
      aspectRatio: 4,
      alignment: "center",
      area: {
        top: 0,
        height: 20,
        left: 5,
        width: 55,
      },
      showBoundingBox: true,
    });

    board.layout('land', {
      aspectRatio: 1,
      alignment: "top right",
      area: {
        top: 25,
        height: 75,
        left: 0,
        width: 65,
      },
      showBoundingBox: true,
    });

    board.all('land').layout('plot', {
      aspectRatio: 1,
      area: {
        top: 0,
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

    board.all(Space, {name: 'cup'}).layout(SprawlDie, {
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
        const count = cup.all(SprawlDie).length;
        const rescount = cup.player!.my('reserve')!.all(SprawlDie).length;
        return (
          <div>
            This is {cup.player!.name}'s dice cup.
            It has { count } { count === 1 ? 'die' :'dice' } in it.
            { count === 0 && rescount === 0 ? `All their dice are placed. If that's still true when their turn starts, the game ends.` : ''}
          </div>
        )},
    })

    board.all('reserve').appearance({
      info: (reserve) => {
        const count = reserve.all(SprawlDie).length;
        const cupcount = reserve.player!.my('cup')!.all(SprawlDie).length;
        return (
          <div>
            This is {reserve.player!.name}'s reserve.
            It has { count } { count === 1 ? 'die' :'dice' } in it.
            { count < 2 ? `The game may be almost over.` :''}
            { count === 0 && cupcount === 0 ? `All their dice are placed. If that's still true when their turn starts, the game ends.` : ''}
          </div>
        )},
    })

    board.all(Plot).forEach((plot: Plot) => {
      let expn: string = '';
      let renderfn = () => <div></div>;

      if (plot.blocker || plot.claimsAgainst()) {
        console.log (`have blocker: ${ plot.blocker }`);
        if (plot.blocker === 'orthogonal') {
          expn = 'Orthogonal';
        } else if (plot.blocker === 'not orthogonal') {
          expn = 'Not orthogonal';
        } else if (plot.blocker instanceof SprawlDie) {
          expn = `Blocked by a ${ plot.blocker.current }`;
        }

        renderfn = () =>
            <div className="blocker">
              { expn }
            </div>
            ;
      }

      if (plot.has(SprawlDie)) {
        const d = plot.first(SprawlDie)!;
        console.log(`have die: ${ d.player.name }'s ${ d.current }.`);
        // const stringbits = {
        //   runs : { twisted: 'Because it is twisted, it runs', 
        //               asis: 'It runs', }, 
        //   fence: { twisted: 'Northeast-Southwest', 
        //               asis: 'Northwest-Southeast', },
        //   wall : { twisted: 'East-West',
        //               asis: 'North-South', },          
        // }

        // let runtext = '';
        // if [3,6].includes(d.current) {
        //   let tk = d.twisted ? 'twisted' : 'asis';
        //   runtext = `${stringbits[runs][tk]} ${stringbits[$d.noun() as keyof typeof stringbits][tk]}` +
        //              ' and blocks the next plot in each of those direcions.'                     
        // }
        const blockstext = [3, 6].includes(d.current) ?
                              (d.twisted 
                                ? ' Because it is twisted, it runs ' 
                                + ( d.current === 6 ? 'East-West ' : 'Northeast-Southwest ')
                                : " It runs "
                                + ( d.current === 6 ? 'North-South ' : 'Northwest-Southeast ') ) 
                              + ' and blocks the next plot in each of those directions.'
                            : '';

        const scoretext = `Each ${d.noun()} scores ` + ( // <-- ucfirst that, maybe also big bold it? 
                d.current === 1
                ? ` nothing, but it holds the space for you to build on later.`
                : d.current === 6
                ? ` one point for each adjacent, non-${d.noun()} die belonging to the same player.`
                : ` its face value (${ d.current }).`
              ) + ( d.current === 2
                ? ` In addition, there is a bonus of one point for each opponent die that touches any number of your ${ d.noun() }s. `
                : d.current === 3 
                ? ` In addition, there is a bonus of one point for each field - belonging to any player - that touches any number of your ${ d.noun() }s. `
                : '')
              ;
        plot.appearance({
          render: renderfn,
          info: () =>
            <>
            <div>
              This plot is occupied by { d.player.name }'s { d.noun() }.
              { blockstext }
            </div>
            <div>
              { scoretext }
            </div>
            </>
        })
      } else {
        plot.appearance({
          render: renderfn,
          info: () => 
            <div>
              This plot is empty.
              { plot.claimsAgainst().length ? ` Placement here may be affected by these nearby claims: ` 
                + plot.claimsAgainst().map((c) => c.player.name + "'s " + c.noun()).join(', ')
                :''}
            </div>
        });
      }
    });

    //   info: plot => {
    //     if (plot.has(SprawlDie)) {
    //       const d = plot.first(SprawlDie)!;
    //       return (
    //         <>
    //         <div>
    //           This plot is occupied by { d.player.name }'s { d.noun() }.
    //           { [3, 6].includes(d.current) ?
    //             (d.twisted 
    //               ? ' Because it is twisted, it runs ' 
    //               + ( d.current === 6 ? 'East-West ' : 'Northeast-Southwest ')
    //               : " It runs "
    //               + ( d.current === 6 ? 'North-South ' : 'Northwest-Southeast ') ) 
    //             + ' and blocks the next plot in each of those directions.'
    //           : ''}
    //         </div>
    //         <div>
    //           {d.noun()}s score { // <-- ucfirst that, maybe also big bold it? 
    //             d.current === 1 
    //             ? ` nothing, but they hold the space for you to build on later.`
    //             : d.current === 6
    //             ? ` one point for each adjacent, non-${d.noun()} die belonging to the same player.`
    //             : ` their face value (${ d.current }).`
    //           }
    //           { (d.current === 2
    //             ? ` In addition, there is a bonus of one point for each opponent die that touches any number of your ${ d.noun() }s. `
    //             : d.current === 3 
    //             ? ` In addition, there is a bonus of one point for each field - beloning to any player - that touches any number of your ${ d.noun() }s. `
    //             : '')
    //           }
    //         </div>
    //         </>
    //       );
    //     } else { return (
    //       <div>
    //         This plot is empty.
    //         { plot.claimsAgainst()?.length ? ` Placement here may be affected by these nearby claims: ` 
    //           + plot.claimsAgainst()?.map((c) => c.player.name + "'s " + c.noun()).join(', ')
    //           :''}
    //       </div>
    //     )}
    //   },
    // });

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
        <p>{board.first(Space, (r) => (r.name! === 'zone' && !r.has(SprawlDie)))?.player!.name} has placed their last die. This may be your last turn.</p>
        </div>
      )
  }
});
