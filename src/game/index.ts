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
      // console.log("doin' a score");
      let baseScore = 0;

      // much safer to recalculate scores from scratch than to try to apply diffs, even if that is un-react-y of me. 
      $.land.all(Die, {'player':this}).forEach((d) => {
        if ([2,3,4].includes(d.current)) {
          baseScore += d.current
          // console.log("scoring a ", d.current);
        } else if (6 === d.current) {
          baseScore += d.container(Plot).adjies().flatMap((p) => p.all(Die, {player: this}).filter((d) => d.current != 6)).length
          // console.log("scoring ", d.container(Plot).adjies().flatMap((p) => p.all(Die, {mine: true}).filter((d) => d.current != 6)).length, " for a 6:", d);
        }});

      const roadBonus = $.land.all(Die, (d) => d.player !== this).filter((d) => 
        d.container(Plot).adjies().filter((p) => 
          p.has(Die, {player: this, current: 2})).length > 0).length;

      const fenceBonus = $.land.all(Die, {current: 4}).filter((d) => 
        d.container(Plot).adjies().filter((p) => 
          p.has(Die, {player: this, current: 3})).length > 0).length;

      // console.log(`${player.name} score: base ${baseScore} plus bonuses: road: ${roadBonus} and fence: ${fenceBonus}`);
      this.score = baseScore + roadBonus + fenceBonus;
      console.log("player new score: ", this.name, baseScore + roadBonus + fenceBonus, this.score);
  };
};

class SprawlBoard extends Board<SprawlPlayer, SprawlBoard> {
  /**
   * Any overall properties of your game go here
   */
  phase: number = 1;
}

const { Space, Piece, Die } = createBoardClasses<SprawlPlayer, SprawlBoard>();

export { Space };

/**
 * Define your game's custom pieces and spaces.
 */

export class Token extends Piece {
  color: 'red' | 'blue';
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

  claimedAgainst (proposal: Die) {
    const asker = proposal.player;
    if (this.has(Die)) {
      const d = this.first(Die);
      if (d.player === asker && d.current !== proposal.current && (d.current === 1 || proposal.current === 4)) { 
        return false;
      } else {
        return true;
      }
    } else {
      // const neighbors = this.adjacencies().flatMap((p) => p.all(Die));
      const neighbors = this.adjies().flatMap((p) => p.all(Die));
      const claimants = neighbors.filter((d) => {
        if (d.player === asker) {
          if (d.current === 2 && this.isOrthoTo(d.container(Plot))) {
            // console.log(this.row, this.column, "blocked by a 2");
            return true;
          }
        } else {
          if (proposal.current != d.current && [3, 6].includes(d.current) && d.pointsTo(this)) {
            // console.log(this.row, this.column, "blocked by a ...", d.current);
            return true;
          }
        }
        return false;
        // return (d.player === asker && this.isOrthoTo(d.container(Plot)));
      });

      return (claimants.length > 0);
    }
  }

}

export class SprawlDie extends Die {
  twisted: boolean;

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

  validPlots () {
    const cup = this.player.my('cup');
    const myPlots = $.land.all(Plot).filter((p) => p.first(Die)?.player === this.player);
    const myStakes = myPlots.filter((p) => p.first(Die).current === 1);
    const myNeighbs = myPlots.flatMap((p) => p.adjies()).filter((p) => ! myPlots.includes(p)).filter((v, i, a) => i === a.indexOf(v));
    const myOrthos = myPlots.flatMap((p) => p.orthies());
    const myDiags = myPlots.flatMap((p) => p.diagies());

    const unblockedNeighbors = myNeighbs.filter((p) => !p.claimedAgainst(this));

    // console.log("plots, stakes, neighbs, orthos, diags, unbies:", myPlots, myStakes, myNeighbs, myOrthos, myDiags, unblockedNeighbors);

    // if (unblockedNeighbors.length == 0) console.log("trouble: no unblockedNeighbors");

    if (this.current === 1) {
      if (unblockedNeighbors.length > 0) {
        return unblockedNeighbors;
      } else {
        const avail = $.land.all(Plot).filter((p) => !p.claimedAgainst(this));
        // console.log("available: ", avail);
        return (avail || cup);
      }
    } else if (this.current === 2) {
      return (unblockedNeighbors.concat(myStakes).filter((p) => ! myOrthos.includes(p)).filter((v, i, a) => i === a.indexOf(v)) || cup);
    } else if (this.current === 3) {
      return (unblockedNeighbors.concat(myStakes).filter((v, i, a) => i === a.indexOf(v)) || cup);
    } else if (this.current === 4) {
      return (unblockedNeighbors.filter((p) => myOrthos.includes(p)).concat(myPlots.filter((p) => !p.claimedAgainst(this))).filter((v, i, a) => i === a.indexOf(v)) || cup);
    } else if (this.current === 5) {
      return myNeighbs.filter((p) => !p.has(Die)).concat(myStakes).concat(cup).filter((v, i, a) => i === a.indexOf(v));
    } else if (this.current === 6) {
      return (unblockedNeighbors.filter((p) => myOrthos.includes(p)).concat(myStakes).filter((v, i, a) => i === a.indexOf(v)) || cup);
    }

    console.log("wtf? in validPlots", this);
    return cup;
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
    if (d.current === 1) { 
      d.player.my('reserve').first(Die)?.putInto(d.player.my('cup'));
    }
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
        prompt: 'pick a building to place',
      },
    ).chooseOnBoard(
      'claim',
      ({building}) => building.validPlots(),
      {
        prompt: `Where will you stake your claim?`,
        skipIf: 'never',
      },
    ).chooseFrom(
      'rotate',
      ({building}) => ['as is'].concat(([3,6].includes(building.current) ? ['twisted'] : [])),
    ).message(
     `{{player}} {{message}}`, ({claim, building}) => (
        {
          message: (
            building.current === 5 
              ? (claim.row && claim.column 
                ? `chose violence at ${claim.row}, ${claim.column}`
                : `put out fire`)
              : (claim.row && claim.column 
                ? `staked a claim at ${claim.row}, ${claim.column}`
                : `had no place for a ${building.current}`)
          )
        }
      )
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
