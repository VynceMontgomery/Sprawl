import {
  createGame,
  createBoardClasses,
  Player,
  Board,
} from '@boardzilla/core';

export class SprawlPlayer extends Player<SprawlPlayer, SprawlBoard> {
  /**
   * Any properties of your players that are specific to your game go here
   */
  score: number = 0;

  calcScore () {
      let baseScore = 0;

      // much safer to recalculate scores from scratch than to try to apply diffs, even if that is un-react-y of me. 
      $.land.all(Die, {'player':this}).forEach((d) => {
        if ([2,3,4].includes(d.current)) {
          baseScore += d.current
        } else if (6 === d.current) {
          baseScore += d.container(Plot).adjies().flatMap((p) => p.all(Die, {player: this}).filter((d) => d.current != 6)).length
        }});

      const roadBonus = $.land.all(Die, (d) => d.player !== this).filter((d) => 
        d.container(Plot).adjies().filter((p) => 
          p.has(Die, {player: this, current: 2})).length > 0).length;

      const fenceBonus = $.land.all(Die, {current: 4}).filter((d) => 
        d.container(Plot).adjies().filter((p) => 
          p.has(Die, {player: this, current: 3})).length > 0).length;

      // console.log(`${player.name} score: base ${baseScore} plus bonuses: road: ${roadBonus} and fence: ${fenceBonus}`);
      this.score = baseScore + roadBonus + fenceBonus;
      // console.log("player new score: ", this.name, baseScore + roadBonus + fenceBonus, this.score);
  };
};

class SprawlBoard extends Board<SprawlPlayer, SprawlBoard> {
  /**
   * Any overall properties of your game go here
   */
  phase: number = 0;
}

const { Space, Piece, Die } = createBoardClasses<SprawlPlayer, SprawlBoard>();

export { Space };

/**
 * Define your game's custom pieces and spaces.
 */

export class Token extends Piece {
  color: 'red' | 'blue';
}

export interface Claim {
  player: Player,
  current: 1|2|3|4|5|6,
}

export class Plot extends Space {
  // HACK STUB DRUNK FIXLATER
  // isAdjacentTo (target: Plot) {
  //   // return (Math.abs(this.row - target.row) <= 1 && Math.abs(this.column - target.column <= 1));
  //   return this.isOrthoTo(target) || this.isDiagonalTo(target);
  // }

  isOrthoTo (target: Plot) {
    return (   Math.abs(this.row - target.row) == 1 && Math.abs(this.column - target.column) == 0
            || Math.abs(this.row - target.row) == 0 && Math.abs(this.column - target.column) == 1);
    // return this.distanceTo(target) === 1;
  }

  isDiagonalTo (target: Plot) {
    return (Math.abs(this.row - target.row) == 1 && Math.abs(this.column - target.column) == 1);
    // return (this.distanceTo(target) > 1.2 && this.distanceTo(target) < 1.8);
    // return this.distanceTo(target) === 2 && this.isAdjacentTo(target);
  }

  adjies () {
    return this.others(Plot).filter((p) => this.isAdjacentTo(p));
  }

  orthies () {
    return this.others(Plot).filter((p) => this.isOrthoTo(p));
  }

  diagies () {
    return this.others(Plot).filter((p) => this.isDiagonalTo(p));
  }


  // Memoized claims. this cache stores all adjacent dice that have any claim on this plot.
  // Now we don't recalculate every spot on the board every turn, only the ones that might have changed.

  claimCache: undefined | Claim[];

  // could replace some of this logic with pointsTo()?
  // this might be more efficient, though, and 2s don't point (currently).

  claimsAgainst (force?: boolean) {
    if (!force && this.claimCache) return this.claimCache;

    const claims: Claim[] = [];

    claims.push(... this.adjacencies().filter((p) => {
      if (p.has(Die)) {
        const d = p.first(Die);
        if (p.row === this.row || p.column === this.column) { // ortho
          if (d.current === 2
              || (d.current === 6 && ((p.row === this.row) === d.twisted))) {
            return true;
          }
        } else if (d.current === 3
          && (d.twisted ? (this.row - p.row !== this.column - p.column) : (this.row - p.row === this.column - p.column))) {
          return true;
        }
      }
    }).map((p) => p.first(Die)));

    this.claimCache = claims;

    return claims;
  }

  // Still have to compare teh claimsagainst the individual die being placed, but that's hopefully not the slow part.
  availableFor (proposal: SprawlDie) {
    const asker = proposal.player;

    if (this.has(Die)) {
      const d = this.first(Die);
      if (d.player === asker && d.current !== proposal.current && (d.current === 1 || proposal.current === 4)) { 
        return true;
      } else {
        return false;
      }
    } else {
      return ! this.claimsAgainst().some((c) => ((c.current === 2) ? c.player === asker
                                               : (c.current !== proposal.current && c.player !== asker)));
    }
  }
}

export class SprawlDie extends Die {
  twisted: boolean;

  noun () {
    return ['','stake','road','fence','field','fire','wall'][this.current];
  }

  verb () {
    return ['','plant','pave','erect','plow','set','build'][this.current];
  }

  pointsTo (spot: Plot) {
    const here = this.container(Plot);
    if (here.isAdjacentTo(spot)
        && (  (    this.current === 3 
                && here.isDiagonalTo(spot)
                && (this.twisted ? (here.row - spot.row !== here.column - spot.column) : (here.row - spot.row === here.column - spot.column)))
            || (   this.current === 6
                && here.isOrthoTo(spot)
                && (this.twisted ? here.row === spot.row : here.column === spot.column))
            )) {
      return true;
    }
    return false;
  }

  // technically returns valid spaces, which might include the cup, which is not a plot.

  validPlots () {
    const cup = this.player.my('cup');
    const myPlots = $.land.all(Plot).filter((p) => p.first(Die)?.player === this.player);
    const myStakes = myPlots.filter((p) => p.first(Die).current === 1);
    const myNeighbs = myPlots.flatMap((p) => p.adjies()).filter((p) => ! myPlots.includes(p)).filter((v, i, a) => i === a.indexOf(v));
    const myOrthos = myPlots.flatMap((p) => p.orthies());
    const myDiags = myPlots.flatMap((p) => p.diagies());

    const unblockedNeighbors = myNeighbs.filter((p) => p.availableFor(this));

    // console.log("plots, stakes, neighbs, orthos, diags, unbies:", myPlots, myStakes, myNeighbs, myOrthos, myDiags, unblockedNeighbors);

    // if (unblockedNeighbors.length == 0) console.log("trouble: no unblockedNeighbors");

    let valids = [];

    if (this.current === 1) {
      if (unblockedNeighbors.length > 0) {
        valids = unblockedNeighbors;
      } else {
        const avail = $.land.all(Plot).filter((p) => p.availableFor(this));
        // console.log("available: ", avail);
        valids = avail;
      }
    } else if (this.current === 2) {
      valids = unblockedNeighbors.concat(myStakes).filter((p) => ! myOrthos.includes(p));
    } else if (this.current === 3) {
      valids = unblockedNeighbors.concat(myStakes);
    } else if (this.current === 4) {
      valids = unblockedNeighbors.filter((p) => myOrthos.includes(p)).concat(myPlots.filter((p) => p.availableFor(this)));
    } else if (this.current === 5) {
      valids = myNeighbs.filter((p) => !p.has(Die)).concat(myStakes).concat(cup);
    } else if (this.current === 6) {
      valids = unblockedNeighbors.filter((p) => myOrthos.includes(p)).concat(myStakes);
    } else {
      console.log("pretty much a panic");
    }

    valids = valids.filter((v, i, a) => i === a.indexOf(v));
    if (valids.length < 2) console.log(`few options for ${this.current}: `, valids);
    if (valids.length < 1) { 
      console.log(`should return instead`, cup);
      return [cup];
    }
    return (valids);
  }
}


export default createGame(SprawlPlayer, SprawlBoard, game => {

  const { board, action } = game;
  const { playerActions, loop, eachPlayer, everyPlayer, whileLoop } = game.flowCommands;

  /**
   * Register all custom pieces and spaces
   */
  board.registerClasses(SprawlDie, Token, Plot);

  const settingsMap = [
    {
      diceCount: 12,
      boardSize: 4 + game.players.length,
    },
    {
      diceCount: 8,
      boardSize: 3 + game.players.length,
    },
    {
      diceCount: 16,
      boardSize: 5 + game.players.length,
    },
  ];

  /**
   * Create your game board's layout and all included pieces.
   */
  const Land = board.create(Space, 'land');
  Land.createGrid({
      rows: settingsMap[game.setting('gameLength')].boardSize, 
      columns: settingsMap[game.setting('gameLength')].boardSize, 
      diagonalDistance: 1.5,
      style: 'square',
    },
    Plot, 
    'plot',
    );
  Land.all('plot').forEach(plot => plot.onEnter(Die, d => {
    plot.adjacencies().forEach((p) => p.claimCache = undefined);
    if (d.current === 1) { 
      d.player.my('reserve').first(Die)?.putInto(d.player.my('cup'));
    }
  }));
  Land.all('plot').forEach(plot => plot.onExit(Die, d => {
    plot.adjacencies().forEach((p) => p.claimCache = undefined);
  }));

  const pp = board.create(Space, 'players');

  for (const player of game.players) {
    const zone = pp.create(Space, 'zone', {player});
    const roll = zone.create(Space, 'roll', {player});
    roll.onEnter(Die, d => d.roll());
    const cup = zone.create(Space, 'cup', { player });
    cup.onEnter(Die, d => d.twisted = false);
    // cup.onEnter(Die, d => d.roll());
    cup.create(SprawlDie, 'd', { player , twisted: false }).current = 1;
    const reserve = zone.create(Space, 'reserve', { player });
    // reserve.onEnter(Die, d => d.roll());
    reserve.createMany(settingsMap[game.setting('gameLength')].diceCount - 1, SprawlDie, 'd', { player , twisted: false});
  }

  /**
   * Define all possible game actions.
   */
  game.defineActions({

    initialStake: player => action({
      prompt: 'Stake your initial claim',
    }).do(() => {
      player.my('cup').first(Die).putInto(player.my('roll'));
      player.my('roll').first(Die).current = 1;
      game.followUp({name: 'placeBuildings'});
    }),

    rollDice: player => action ({
      prompt: "Whatcha got?", 
      condition: player.my('cup').has(Die) || player.my('reserve').has(Die),
    }).do(() => {
      player.my('reserve').first(Die)?.putInto(player.my('cup'));
      player.my('cup').all(Die).putInto(player.my('roll'));
      if (! Land.has(Die, {mine: true})) {
        player.my('roll').first(Die, (d) => d.current !== 1).current = 1;
      }
    }), 

    placeBuildings: player => action ({
      prompt: "Grab some Land",
      condition: player.my('roll').has(Die),
    }).chooseOnBoard(
      'building',
      () => { 
        const rolls = player.my('roll').all(Die);
        const opts = new Set(rolls.map((d) => d.current));
        if (opts.size > 1) {
          return rolls;
        } else {
          return rolls.firstN(1, Die);
        }
      },
      {
        prompt: 'pick a die to place on the map',
      },
    ).chooseOnBoard(
      'claim',
      ({building}) => { 
        const vps = building.validPlots(); 
        if (vps.length < 2) console.log("got: ", vps);
        return vps;
      },
      {
        prompt: (({building}) => `Where will you ${building.verb()} a ${building.noun()}?`),
        skipIf: 'never',
      },
    // ).chooseGroup({
    //   choices: {
    //     rotate: ['board', ({building}) => {return [building]}, {skipIf: 'never'}],
    //     // done: ['select', ['Done'], {prompt: 'Click done when die faces correct direction', skipIf: 'never'}],
    //   },
    //   // options: {
    //   //   validate: (v) => v.done == 'Done'
    //   // },
    // }

    ).chooseFrom(
      'rotate',
      ({building}) => ['as is'].concat(([3,6].includes(building.current) ? ['twisted'] : [])),
      {prompt: 'would you like to twist it?'},
    ).message(`{{ message }}`, ({claim, building}) => ({
        message: ( claim.row && claim.column)
          ? `${player} ${building.verb()}s a ${building.noun()} at (${claim.column}, ${claim.row})`
          : ( (building.current === 5)
            ? `${player} puts out a fire. How nice!`
            : `${player} has no place to ${building.verb()} a ${building.noun()}`)
      })
    ).do(({claim, building, rotate}) => {
      if (claim === player.my('cup')) {
        player.my('roll').all(Die).forEach((d) => d.putInto(claim));
      } else {

        player.my('roll').all(Die).filter((d) => d.current != building.current).forEach((d) => d.putInto(d.player.my('cup')));

        if (claim.has(Die)) {
          claim.all(Die).putInto(player.my('cup'));
        }

        if (rotate === 'twisted') {
          building.twisted = true;
        }

        building.putInto(claim);

        if (building.current === 5) {
          building.container(Plot).adjacencies().flatMap(p => p.all(Die)).forEach(d => {
          // building.container(Plot).adjies().flatMap(p => p.all(Die)).forEach(d => {
            if (d.player === building.player) {
              d.putInto(d.player.my('reserve'));
            } else if (d.current !== 6) {
              d.putInto(d.player.my('cup'));
            }
          });
          building.putInto(building.player.my('reserve'));
        }

        // Some trouble here with game.announce failing?

        if (player.my('reserve').all(Die).length < 2) {
          console.log(`short reserve (${player.my('reserve').all(Die).length}) in phase ${board.phase}`);
          if (board.phase < 2) {
            const well = game.announce('EndGame');
            if (well) {
              console.log(`well ${well}`);
            } else { 
              console.log(`well... ${well}`);
              console.log(game.announce('EndGame'));
            }
            board.phase = 2;
          }
        }

        if (player.my('zone').all(Die).length === 0 && board.phase < 3) {
          game.announce("LastTurn");
          board.phase = 3;
        }

      }
    }),

    endGame: player => action ({
      prompt: 'Game over!',
      condition: !(player.my('cup').has(Die) || player.my('reserve').has(Die)),
    }).do(() => { 
      game.finish(game.players.sortedBy('score', 'desc')[0]);
    }),
  });

  /**
   * Define the game flow, starting with board setup and progressing through all
   * phases and turns.
   */
  game.defineFlow(
    eachPlayer({
      name: 'player',
      do: playerActions({
        actions: ['initialStake']   // may not be necessary, now that the edge case of havingnothing on the board is properly handled
      }),
    }),

    () => board.phase = 1,

    loop(
      eachPlayer({
        name: 'player',
        do: [
          playerActions({ actions: [
            'rollDice', 'endGame'
          ]}),
          whileLoop({
            while: ({player}) => player.my('roll').has(Die),
            do: playerActions({ actions: [
              'placeBuildings'
            ]}),
          }),
          () => game.players.forEach((p) => p.calcScore()),
        ], 
      })
    )
  );
});
