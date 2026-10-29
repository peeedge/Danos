import { formatMoney } from '../lib/scoringUtils';
import { DAY_RULES } from '../game/rules';
import { WEEKDAY_SHORT } from '../lib/dateUtils';

export function HowToPlay() {
  return (
    <div className="howto">
      <p className="howto__lead">
        A Jeopardy-style column that climbs all week and ends with Final Jeopardy on Sunday. Play one tile a day, or
        finish the whole remaining column today.
      </p>
      <ol className="howto__steps">
        <li>
          <strong>Pick a tile.</strong> Today’s clue and every remaining tile this week are open. Read the clue and
          respond — ideally as a question (“What is…?”). Capitalization, punctuation and small typos are forgiven.
        </li>
        <li>
          <strong>One shot.</strong> A correct response earns the clue’s value; a wrong one subtracts it. A day you let
          pass is worth $0 and breaks your streak.
        </li>
        <li>
          <strong>Watch for Daily Doubles.</strong> About one clue in ten hides one. Wager up to your weekly balance (or the
          clue’s value, if that’s more) before the clue appears.
        </li>
        <li>
          <strong>Sunday is Final Jeopardy.</strong> See the category, wager part or all of your week’s winnings, then answer
          one last clue. You can play it as soon as Sunday’s tile is in this week’s column.
        </li>
      </ol>
      <ul className="howto__values" aria-label="Clue values by day">
        {DAY_RULES.map((rule) => (
          <li key={rule.weekday} className={rule.gameType === 'final' ? 'howto__value--final' : ''}>
            <span>{WEEKDAY_SHORT[rule.weekday]}</span>
            <strong>{rule.gameType === 'final' ? 'Final' : formatMoney(rule.baseValue)}</strong>
          </li>
        ))}
      </ul>
      <p className="howto__fine">
        Weekly winnings reset every Monday; lifetime winnings and your longest streak carry on. All dollars are virtual.
      </p>
    </div>
  );
}
