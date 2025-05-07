import { SpectralCMDHome, CassCheckly, Config } from "@cassidy/spectral-home";
import { abbreviateNumber, UNIRedux } from "@cassidy/unispectra";
import utils from "@cassidy/utils";

export const meta: CassidySpectra.CommandMeta = {
  name: "balance",
  description: "Check your virtual cash",
  otherNames: ["bal", "money"],
  version: "3.2.0",
  usage: "{prefix}{name}",
  category: "Finance",
  author: "Liane Cagara",
  permissions: [0],
  noPrefix: "both",
  waitingTime: 0,
  requirement: "3.0.0",
  icon: "💰",
  cmdType: "cplx_g",
};

export const style: CassidySpectra.CommandStyle = {
  title: "Balance 💵",
  titleFont: "bold",
  contentFont: "fancy",
};

function isBrokenMoney(amount: number) {
  return (
    isNaN(amount) ||
    !isFinite(amount) ||
    amount < 0 ||
    amount >= Number.MAX_VALUE
  );
}

function sortUsers(
  users: { [x: string]: any },
  top: number,
  money: typeof global.handleStat
) {
  let result = {};
  let sortedKeys = Object.keys(users).sort(
    (a, b) =>
      money.extractMoney(users[b]).total - money.extractMoney(users[a]).total
  );
  if (top) sortedKeys = sortedKeys.slice(0, top);
  for (const key of sortedKeys) result[key] = users[key];
  return result;
}

export function getBehindAhead(
  id: string,
  users: any,
  money: typeof global.handleStat
) {
  const sorted = sortUsers(users, undefined, money);
  const keys = Object.keys(sorted);
  const index = keys.indexOf(id);
  return index === -1
    ? { behind: [], ahead: [] }
    : { ahead: keys.slice(0, index), behind: keys.slice(index + 1) };
}

export function getTop(id: string, users: any, money: any) {
  return Object.keys(sortUsers(users, undefined, money)).indexOf(id) + 1;
}

const configs: Config[] = [
  {
    key: "home",
    description: "Your balance homepage.",
    args: ["[uid]"],
    aliases: ["-h"],
    icon: "💸",
    validator: new CassCheckly([
      { index: 0, type: "string", required: false, name: "userID" },
    ]),
    async handler(
      { money, input, output, prefix, Collectibles, commandName },
      { itemList, spectralArgs }
    ) {
      let senderID = input.senderID;
      if (input.replier) senderID = input.replier.senderID;
      if (input.hasMentions) senderID = input.firstMention.senderID;
      if (spectralArgs[0]) senderID = spectralArgs[0];

      let warn = "";
      let playerMoney: UserData = await money.getCache(senderID);
      if (!playerMoney || !playerMoney.name) {
        return output.reply("❌ This user is a ghost!");
      }
      const cll = new Collectibles(playerMoney?.collectibles || []);

      if (isBrokenMoney(playerMoney.money))
        warn = `\n\n⚠️ Corrupted! Use **${prefix}money-fix**`;

      const items = cll
        .getAll()
        .filter(({ amount }) => amount > 0)
        .map(
          ({ metadata, amount }) =>
            `${metadata.icon} ${metadata.name}(s): x${utils.parseCurrency(
              amount
            )}`
        )
        .join("\n");
      const otherMoney = money.extractMoney(playerMoney);
      const name =
        input.hasMentions || input.replier || spectralArgs[0]
          ? playerMoney.name
          : `${playerMoney.name} (You)`;
      output.setUIName(name);

      const outputText = [
        `👤 **${name}**`,
        ``,
        `💰 Coin(s): ${formatCash(playerMoney.money, "💵", true)}`,
        `💷 Point(s): ${formatCash(playerMoney.battlePoints, "💷")}`,
        `🏦 Bank(s): ${formatCash(otherMoney.bank)}`,
        `🎒 Cheque(s): ${formatCash(otherMoney.cheques)}`,
        `🚗 Car(s): ${formatCash(otherMoney.carsAssets)}`,
        `🐈 Pet(s): ${formatCash(otherMoney.petsAssets)}`,
        (items ? `${items}` : "") + warn,
        `${UNIRedux.standardLine}`,
        `${UNIRedux.arrow} ***All Options***`,
        ``,
        itemList,
        `\nType **${prefix}${commandName}-check** to see a complete balance info.`,
      ].join("\n");

      return output.reply(outputText);
    },
  },
  {
    key: "top",
    cooldown: 5,
    description: "See the Top 10 richest",
    aliases: ["-t", "leaders"],
    icon: "🏆",
    async handler({ money, input, output, Collectibles }) {
      const users = await money.getAllCache();
      const topUsers = sortUsers(users, 10, money);
      const participantIDs = Array.isArray(input.participantIDs)
        ? input.participantIDs
        : [];

      let result = [`🏆 **Top 10 Users** 🏆\n`];
      let index = 1,
        lastMoney: number;
      for (const key in topUsers) {
        const user: UserData = topUsers[key];
        const otherMoney = money.extractMoney(user);
        const cll = new Collectibles(user.collectibles || []);
        const items = cll
          .getAll()
          .filter(({ amount }) => amount > 0)
          .map(
            ({ metadata, amount }) =>
              `${metadata.icon} ${metadata.name}(s): x${abbreviateNumber(
                amount
              )}`
          )
          .join("\n");

        result.push(
          `${
            index === 1
              ? `👑 ${UNIRedux.charm} ${FontSystem.applyFonts(
                  String(user.name).toUpperCase(),
                  "double_struck"
                )} ${UNIRedux.charm}`
              : index < 10
              ? `0${index}. **${user.name}**`
              : `${index}. **${user.name}**`
          }`,
          `💰 Total Coins(s): ${formatCash(otherMoney.total, "💵", true)}`,
          `💵 Local(s): ${formatCash(user.money)}`,
          `💷 Point(s): ${formatCash(user.battlePoints, "💷")}`,
          `🏦 Bank(s): ${formatCash(otherMoney.bank)}`,
          `🎒 Cheque(s): ${formatCash(otherMoney.cheques)}`,
          `🚗 Car(s): ${formatCash(otherMoney.carsAssets)}`,
          `🐈 Pet(s): ${formatCash(otherMoney.petsAssets)}`,
          items ? items : "",
          lastMoney
            ? `📉 Gap(s): $${formatCash(
                Math.abs(lastMoney - (user.money || 0))
              )}`
            : "",

          participantIDs.includes(key) ? `✅ In Group` : "",
          `\n`
        );
        index++;
        lastMoney = user.money || 0;
      }
      output.reply(result.filter(Boolean).join("\n"));
    },
  },
  {
    key: "fix",
    description: "Fix broken money",
    aliases: ["-f"],
    icon: "🔧",
    handler: async ({ money, input, output }) => {
      const { money: amount } = await money.get(input.senderID);
      if (isBrokenMoney(amount)) {
        await money.setItem(input.senderID, { money: 0 });
        output.reply(
          `✅ Fixed from ${utils.parseCurrency(amount)} to 0$ ${UNIRedux.charm}`
        );
      } else {
        output.reply(
          `❌ **${utils.parseCurrency(amount)}$** is fine ${UNIRedux.charm}`
        );
      }
    },
  },
  {
    key: "reset",
    description: "Reset your money to 0",
    aliases: ["-r"],
    icon: "♻️",
    validator: new CassCheckly([
      {
        index: 0,
        type: "string",
        regex: /^confirm$/,
        required: true,
        name: "confirmation",
      },
    ]),
    async handler({ money, input, output }) {
      await money.set(input.senderID, { money: 0 });
      output.reply(`✅ Reset to 0$ ${UNIRedux.charm}`);
    },
  },
];

const home = new SpectralCMDHome(
  {
    argIndex: 0,
    isHypen: false,
    globalCooldown: 5,
    defaultKey: "home",
    errorHandler: (error, ctx) => {
      ctx.output.error(error);
    },
    defaultCategory: "Finance",
  },
  configs
);

import { defineEntry } from "@cass/define";
import { FontSystem } from "cassidy-styler";
import { formatCash } from "@cass-modules/ArielUtils";

export const entry = defineEntry(async (ctx) => {
  return home.runInContext(ctx);
});
