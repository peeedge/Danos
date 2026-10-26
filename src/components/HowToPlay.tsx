import { formatMoney } from '../lib/scoringUtils';
import { DAY_RULES } from '../game/rules';
import { WEEKDAY_SHORT } from '../lib/dateUtils';

export function HowToPlay() {
  return (
    <div className="howto">
      <p className="howto__lead">
        One Jeopardy-style clue a day. The stakes climb all week and end with Final Jeopardy on Sunday.
      </p>
      <ol className="howto__steps">
        <li>
          <strong>Pick today’s tile.</strong> Read the clue and respond — ideally as a question (“What is…?”). Capitalization,
          punctuation and small typos are forgiven.
        </li>
        <li>
          <strong>One shot.</strong> A correct response earns the clue’s value; a wrong one subtracts it. A day you skip is
          worth $0 but breaks your streak.
        </li>
        <li>
          <strong>Watch for Daily Doubles.</strong> About one clue in ten hides one. Wager up to your weekly balance (or the
          clue’s value, if that’s more) before the clue appears.
        </li>
        <li>
          <strong>Sunday is Final Jeopardy.</strong> See the category, wager part or all of your week’s winnings, then answer
          one last clue.
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
