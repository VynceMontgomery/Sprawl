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
  scoreDetail: {};

  calcScore () {
      let baseScore = 0;
      let scoreObj: {road: number, fence: number, field: number, wall: number, roadBonus: number, fenceBonus: number} 
          = {road: 0, fence: 0, field: 0, wall: 0, roadBonus: 0, fenceBonus: 0};

      // much safer to recalculate scores from scratch than to try to apply diffs, even if that is un-react-y of me. 
      $.land.all(SprawlDie, {'player':this}).forEach((d) => {
        if ([2,3,4].includes(d.current)) {
          scoreObj[d.noun() as keyof typeof scoreObj] += d.current;
        } else if (6 === d.current) {
          scoreObj[d.noun() as keyof typeof scoreObj] += d.container(Plot)!.adjies().flatMap((p) => p.all(SprawlDie, {player: this}).filter((n) => n.current != 6)).length
        }});

      scoreObj['roadBonus'] = $.land.all(SprawlDie, (d) => d.player !== this).filter((d) => 
        d.container(Plot)!.adjies().filter((p) => 
          p.has(SprawlDie, {player: this, current: 2})).length > 0).length;

      scoreObj['fenceBonus'] = $.land.all(SprawlDie, {current: 4}).filter((d) => 
        d.container(Plot)!.adjies().filter((p) => 
          p.has(SprawlDie, {player: this, current: 3})).length > 0).length;

      // console.log(`${player.name} score: base ${baseScore} plus bonuses: road: ${roadBonus} and fence: ${fenceBonus}`);
      this.scoreDetail = scoreObj;
      this.score = ['road', 'fence', 'field', 'wall', 'roadBonus', 'fenceBonus'].reduce((a: number, s: keyof typeof scoreObj) => a + scoreObj[s], 0);
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

// export interface Claim {
//   player: Player,
//   current: 1|2|3|4|5|6,
// }

export class Plot extends Space {
  row: number;
  column: number;
  gridparity: string = ''; // ['even', 'odd'].at((this.row + this.column) % 2)!; // happens too soon?


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

  claimCache: SprawlDie[] = [];

  // could replace some of this logic with pointsTo()?
  // this might be more efficient, though, and 2s don't point (currently).

  claimsAgainst (force?: boolean) {
    if (!force && this.claimCache.length) return this.claimCache;

    const claims: SprawlDie[] = [];

    claims.push(... this.adjacencies()!.filter((p: Plot) => {
      if (p.has(SprawlDie)) {
        const d = p.first(SprawlDie)!;
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
      return false;
    }).map((p: Plot) => p.first(SprawlDie)!));

    this.claimCache = claims;

    return claims;
  }

  blocker: SprawlDie | string | undefined = undefined;

  // find a claim that prevents proposed die from being put in this location. (there may be many)
  blockingClaim (proposal: SprawlDie) {
    return this.claimsAgainst().find((c) => ((c.current === 2) ? c.player === proposal.player
                                               : (c.current !== proposal.current && c.player !== proposal.player)));
  }

  // Still have to compare the claimsAgainst the individual die being placed, but that's hopefully not the slow part.
  availableFor (proposal: SprawlDie) {
    const asker = proposal.player;

    if (this.has(SprawlDie)) {
      const d = this.first(SprawlDie)!;
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
  player: SprawlPlayer;
  twisted: boolean;

  noun () {
    return ['','stake','road','fence','field','fire','wall'][this.current];
  }

  verb () {
    return ['','plant','pave','erect','plow','set','build'][this.current];
  }

  // pointsTo (spot: Plot) {
  //   const here = this.container(Plot);
  //   if (here.isAdjacentTo(spot)
  //       && (  (    this.current === 3 
  //               && here.isDiagonalTo(spot)
  //               && (this.twisted ? (here.row - spot.row !== here.column - spot.column) : (here.row - spot.row === here.column - spot.column)))
  //           || (   this.current === 6
  //               && here.isOrthoTo(spot)
  //               && (this.twisted ? here.row === spot.row : here.column === spot.column))
  //           )) {
  //     return true;
  //   }
  //   return false;
  // }


  // technically returns valid spaces, which might include the cup, which is not a plot.
  validPlots () {
    console.log(`valid plots for ${ this.player.name }'s ${ this.current }?`);
    const cup = this.player.my('cup')!;
    const myPlots = $.land.all(Plot).filter((p) => {delete p.blocker; return p.first(SprawlDie)?.player === this.player});
    const myStakes = myPlots.filter((p) => p.first(SprawlDie)!.current === 1);
    const myNeighbs = myPlots.flatMap((p) => p.adjies()).filter((p) => ! myPlots.includes(p)).filter((v, i, a) => i === a.indexOf(v));
    const myOrthos = myPlots.flatMap((p) => p.orthies());
    const myDiags = myPlots.flatMap((p) => p.diagies());

    const unblockedNeighbors = myNeighbs.filter((p) => p.availableFor(this));

    if (unblockedNeighbors.length < myNeighbs.length){
      // console.log(`found ${ myNeighbs.length } Ns and ${ unblockedNeighbors.length } un, for ${ myNeighbs.length - unblockedNeighbors.length } blocked Ns`);
      const claims = myNeighbs.filter((p) => !p.availableFor(this)).forEach((p) => {
        if (!p.has(SprawlDie)) {
          console.log(`Blocking ${p.column}, ${p.row} with ${p.blockingClaim(this)?.current} (total: ${this.board.all(Plot, (p) => !!p.blocker).length } blockers)` );
          p.blocker = p.blockingClaim(this);
        }
      }
      );
    }

    // console.log("plots, stakes, neighbs, orthos, diags, unbies:", myPlots, myStakes, myNeighbs, myOrthos, myDiags, unblockedNeighbors);

    // if (unblockedNeighbors.length == 0) console.log("trouble: no unblockedNeighbors");

    let valids: Plot[] = [];

    // Stakes
    if (this.current === 1) {
      // Generally any unblocked neighbor
      if (unblockedNeighbors.length > 0) {
        valids = unblockedNeighbors;
      // but if there aren't any, can go anywhere not blocked.
      } else {
        const avail = $.land.all(Plot).filter((p) => p.availableFor(this));
        $.land.all(Plot).filter((p) => !p.availableFor(this) && !(p.has(SprawlDie))).forEach((p) => p.blocker = p.blockingClaim(this));
        // console.log("available: ", avail);
        valids = avail;
      }

    // Roads: stakes or unblocked plots which are adjacent but not orthogonally adjacent
    } else if (this.current === 2) {
      valids = unblockedNeighbors.concat(myStakes).filter((p) => ! myOrthos.includes(p));
      unblockedNeighbors.concat(myStakes).forEach((p) => {
        myOrthos.includes(p) ? p.blocker = 'orthogonal' : delete p.blocker;
      });

    // Fences: any unblocked adjacent plot, or stake
    } else if (this.current === 3) {
      valids = unblockedNeighbors.concat(myStakes);

    // Fields: any existing die or orthoganal unblocked adjacency
    } else if (this.current === 4) {
      valids = unblockedNeighbors.filter((p) => myOrthos.includes(p)).concat(myPlots.filter((p) => p.availableFor(this)));
      unblockedNeighbors.forEach((p) => {
        // console.log(`testing ${p.column}, ${p.row} and ${myOrthos.includes(p)}`);
        myOrthos.includes(p) ? delete p.blocker : p.blocker = 'not orthogonal';
        // console.log(`so ${ p.blocker }`);
      });

    // Fire: my stakes or any empty adjacent plot, or the cup.
    } else if (this.current === 5) {
      valids = myNeighbs.filter((p) => !p.has(SprawlDie)).concat(myStakes);

    // orthoganal unblocked adjaceny
    } else if (this.current === 6) {
      valids = unblockedNeighbors.filter((p) => myOrthos.includes(p)).concat(myStakes);
      unblockedNeighbors.forEach((p) => {
        // console.log(`testing ${p.column}, ${p.row} and ${myOrthos.includes(p)}`);
        myOrthos.includes(p) ? delete p.blocker : p.blocker = 'not orthogonal';
        // console.log(`so ${ p.blocker }`);
      });
    } else {
      console.log("pretty much a panic");
    }

    console.log(`there are ${this.board.all(Plot, (p) => !!p.blocker).length } blocked plots for ${this.player}'s ${this.current}`);
    // FIXME can be removed in some future core (current 0.0.91);
    valids = valids.filter((v, i, a) => i === a.indexOf(v));
    // if (valids.length < 2) console.log(`few options for ${this.current}: `, valids);
    if (valids.length < 1) { 
      // console.log(`should return instead`, cup);
      return [cup];
    } else if (this.current === 5) {
      return [...valids, cup];
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
  board.registerClasses(SprawlDie, Plot);

  const settingsMap = {
    shorter: {
      diceCount: 8,
      boardSize: 3 + game.players.length,
    },
    normal: {
      diceCount: 12,
      boardSize: 4 + game.players.length,
    },
    longer: {
      diceCount: 16,
      boardSize: 5 + game.players.length,
    },
  };

  const gameLength = game.setting('gameLength') as 'shorter' | 'normal' | 'longer';

  /**
   * Create your game board's layout and all included pieces.
   */
  board.create(Space, 'banner');

  const Land = board.create(Space, 'land');
  Land.createGrid({
      rows: settingsMap[gameLength].boardSize,
      columns: settingsMap[gameLength].boardSize, 
      diagonalDistance: 1.5,
      style: 'square',
    },
    Plot, 
    'plot',
    );
  Land.all('plot').forEach((plot: Plot) => plot.onEnter(SprawlDie, d => {
    plot.adjacencies().forEach((p: Plot) => p.claimCache = []);
    if (d.current === 1) {
      d.player.my('reserve')!.first(SprawlDie)?.putInto(d.player.my('cup')!);
    }
  }));
  Land.all('plot').forEach((plot: Plot) => plot.onExit(SprawlDie, d => {
    plot.adjacencies().forEach((p: Plot) => p.claimCache = []);
  }));

  const pp = board.create(Space, 'players');

  for (const player of game.players) {
    const zone = pp.create(Space, 'zone', {player});
    const roll = zone.create(Space, 'roll', {player});
    roll.onEnter(SprawlDie, d => d.roll());
    const cup = zone.create(Space, 'cup', { player });
    cup.onEnter(SprawlDie, d => d.twisted = false);
    cup.create(SprawlDie, 'd', { player , twisted: false }).current = 1;
    const reserve = zone.create(Space, 'reserve', { player });
    reserve.createMany(settingsMap[gameLength].diceCount - 1, SprawlDie, 'd', { player , twisted: false});
  }

  /**
   * Define all possible game actions.
   */
  game.defineActions({

    initialStake: player => action({
      prompt: 'Stake your initial claim',
    }).do(() => {
      player.my('cup')!.first(SprawlDie)!.putInto(player.my('roll')!);
      player.my('roll')!.first(SprawlDie)!.current = 1;
      game.followUp({name: 'placeBuildings'});
    }),

    rollDice: player => action ({
      prompt: "Whatcha got?", 
      condition: player.my('cup')!.has(SprawlDie) || player.my('reserve')!.has(SprawlDie),
    }).do(() => {
      player.my('reserve')!.first(SprawlDie)?.putInto(player.my('cup')!);
      player.my('cup')!.all(SprawlDie).putInto(player.my('roll')!);
      if ((!Land.has(SprawlDie, {mine: true})) && player.my('roll')!.has(SprawlDie, (d) => d.current !== 1)) {
        player.my('roll')!.first(SprawlDie, (d) => d.current !== 1)!.current = 1;
      }
    }), 

    placeBuildings: player => action ({
      prompt: "Grab some Land",
      condition: player.my('roll')!.has(SprawlDie),
    }).chooseOnBoard(
      'building',
      () => {
        const rolls = player.my('roll')!.all(SprawlDie);
        const opts = new Set(rolls.map((d) => d.current));
        if (opts.size > 1) {
          return rolls;
        } else {
          return rolls.firstN(1, SprawlDie);
        }
      },
      {
        prompt: 'pick a die to place on the map',
      },
    ).chooseOnBoard(
      'claim',
      ({building}) => {
        return building.validPlots()!;
      },
      {
        prompt: (({building}) => `Where will you ${building.verb()} a ${building.noun()}?`),
        skipIf: 'never',
      },
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
      console.log(`have ${ board.all(Plot, (p) => !!p.blocker).length } oustanding blockers.`)
      if (claim === player.my('cup')) {
        player.my('roll')!.all(SprawlDie).forEach((d) => d.putInto(claim));
      } else {

        player.my('roll')!.all(SprawlDie).filter((d) => d.current != building.current).forEach((d) => d.putInto(d.player.my('cup')!));

        if (claim.has(SprawlDie)) {
          claim.all(SprawlDie).putInto(player.my('cup')!);
        }

        if (rotate === 'twisted') {
          building.twisted = true;
        }

        building.putInto(claim);

        if (building.current === 5) {
          claim.adjacencies().flatMap((p: Plot) => p.all(SprawlDie)).forEach((d: SprawlDie) => {
          // building.container(Plot).adjies().flatMap(p => p.all(Die)).forEach(d => {
            if (d.player === building.player) {
              d.putInto(d.player.my('reserve')!);
            } else if (d.current !== 6) {
              d.putInto(d.player.my('cup')!);
            }
          });
          building.putInto(building.player.my('reserve')!);
        }

        // Some trouble here with game.announce failing?

        if (player.my('reserve')!.all(SprawlDie).length < 2) {
          // console.log(`short reserve (${player.my('reserve').all(SprawlDie).length}) in phase ${board.phase}`);
          if (board.phase < 2) {
          //   const well = game.announce('EndGame');
          //   if (well) {
          //     console.log(`well ${well}`);
          //   } else { 
          //     console.log(`well... ${well}`);
          //     console.log(game.announce('EndGame'));
          //   }
              board.phase = 2;
            }
          }

        if (player.my('zone')!.all(SprawlDie).length === 0 && board.phase < 3) {
          game.announce("LastTurn");
          board.phase = 3;
        }
      }
    }),

    endGame: player => action ({
      prompt: 'Game over!',
      condition: !(player.my('cup')?.has(SprawlDie) || player.my('reserve')?.has(SprawlDie)),
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
        actions: ['initialStake']   // may not be necessary, now that the edge case of having nothing on the board is properly handled
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
            while: ({player}) => player.my('roll').has(SprawlDie),
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
