// @ts-check
import { abbreviateNumber, UNIRedux } from "@cassidy/unispectra";
import { parseBet } from "@cass-modules/ArielUtils";
import { FontSystem } from "cassidy-styler";
import { UserData } from "@cass-modules/cassidyUser";
const { fonts } = FontSystem;

export const meta: CassidySpectra.CommandMeta = {
  name: "abank",
  version: "1.0.2",
  author: "original idea by Duke Agustin,recreated by Liane Cagara",
  waitingTime: 1,
  description: "Manage your finances with Ariel's Bank (𝐀-𝐁𝐀𝐍𝐊 ®).",
  category: "Finance",
  noPrefix: "both",
  otherNames: ["bank", "arielbank", "b", "ac", "acbank"],
  requirement: "3.0.0",
  icon: "🏦",
  requiredLevel: 5,
  cmdType: "arl_g",
};

export interface Award {
  type: string;
  info: string;
  date: number;
}

// export const style = {
//   title: "𝐀-𝐁𝐀𝐍𝐊 ® | 🏦",
//   titleFont: "bold",
//   contentFont: "none",
// };

export const limitKey = "bank_reach_limit";
const percentLimit = 0.2;

const formatTrophy = (data: UserData & { awards?: Award[] }) => {
  return `${
    Array.isArray(data.awards) && data.awards.some((i) => i.type === limitKey)
      ? `🏆 ${fonts.bold(
          `${getTrophy(data).length > 1 ? `x${getTrophy(data).length} ` : ""}`
        )}${fonts.double_struck(data.bankData.nickname)}`
      : `${data.bankData.nickname}`
  }`;
};

const getTrophy = (data: UserData & { awards?: Award[] }) =>
  (data.awards ?? []).filter((i) => i.type === limitKey);

const deductTrophy = (data: UserData & { awards?: Award[] }) => {
  const awards = data.awards ?? [];
  const latest = getTrophy(data)
    .sort((a, b) => b?.date - a.date)
    .at(0);
  if (latest) {
    const ind = awards.indexOf(latest);
    if (ind === -1) {
      throw new Error("???");
    }
    awards.splice(ind, 1);

    data.awards = awards;
  } else {
    throw new Error("???");
  }
};

const formatCash = (amount = 0, abbr = true) =>
  `${
    abbr ? `(**${abbreviateNumber(amount)}**) ` : ""
  }${amount.toLocaleString()} 💵`;

const ABANK = fonts.serif("AC-BANK");

const NOTIF = `🏦 ${fonts.bold("ARIEL-CASS NOTIF")} 👩🏻‍💼`;

export async function entry({
  input,
  output,
  money,
  args,
  CassExpress,
  prefix,
  commandName,
}: CommandContext) {
  const userData = await money.getItem(input.senderID);
  const cassExpress = new CassExpress(userData.cassExpress ?? {});
  let {
    name,
    money: userMoney,
    bankData = { bank: 0, nickname: null },
  } = userData;
  bankData.bank = Math.min(bankData.bank, Number.MAX_VALUE);
  if (!name) {
    return output.reply(
      `${NOTIF}\n${UNIRedux.standardLine}\nSorry, you must register your name with ${prefix}identity-setname first!`
    );
  }
  if (bankData.bank >= Number.MAX_VALUE) {
    await saveTrophy(userData, saveData, input.senderID);
  }
  if (!args[0]) {
    args.unshift(input.propertyArray[0]);
  }
  const targetArgs = String(args[0]).toLowerCase();

  async function saveData(info: Partial<UserData>, id = input.senderID) {
    return await money.setItem(id, info);
  }
  const trophys = getTrophy(userData);

  const handlers = {
    async register() {
      if (bankData.nickname) {
        return output.reply(
          `${NOTIF}\n${UNIRedux.standardLine}\nYou already have an ${ABANK} ® account with nickname: ${bankData.nickname}.`
        );
      }
      const nickname = args[1];
      if (!nickname || nickname.length < 3) {
        return output.reply(
          `${NOTIF}\n${UNIRedux.standardLine}\nPlease provide a valid nickname (at least 3 characters) for your ${ABANK} ® account.`
        );
      }
      bankData.nickname = nickname;
      bankData.bank = (bankData.bank ?? 0) + 1000;
      cassExpress.bankInLog(1000);
      await saveData({
        money: userMoney,
        bankData,
        cassExpress: cassExpress.raw(),
      });
      return output.reply(
        `${fonts.bold(`Your ${ABANK} ® account created successfully`)}\n${
          UNIRedux.standardLine
        }\nFree ${formatCash(1000)} upon register.`
      );
    },
    async check() {
      let targetData = userData;
      const id = input.detectID ?? args[1];
      let isPeek = false;
      if (id) {
        if (await money.exists(id)) {
          const da = await money.getItem(id);
          targetData = da;
          isPeek = true;
        } else {
          const target = await money.queryItem({
            "value.bankData.nickname": id,
          });
          if (target) {
            targetData = target;
            isPeek = true;
          }
        }
      }
      if (id && !isPeek) {
        return output.reply(
          `${NOTIF}\n${UNIRedux.standardLine}\nThe user does not have a ${ABANK} ® account with the given nickname.`
        );
      }
      if (!targetData.bankData?.nickname) {
        return output.reply(
          `${NOTIF}\n${UNIRedux.standardLine}\nYou do not have an ${ABANK} ® account. Register with ${prefix}${commandName} register <nickname>.`
        );
      }
      return output.reply(
        `${trophys.length > 0 ? `🏆 ***Bank Awardee*** 🏆\n` : ""}${
          UNIRedux.standardLine
        }\n➥ ${isPeek ? `**Peeking**: ` : ""}${
          targetData.userMeta?.name ?? targetData.name
        }\n${UNIRedux.standardLine}\n${
          trophys.length > 0 ? "👑" : "💳"
        }: ${formatTrophy(targetData)}\n${formatCash(
          targetData.bankData?.bank
        )}\n${UNIRedux.standardLine}${
          trophys.length > 0 && !isPeek
            ? `\n${UNIRedux.arrow} You can still withdraw your old bank if you have **zero** bank balance. It will also remove your trophy.`
            : ""
        }`
      );
    },
    async withdraw() {
      if (!bankData.nickname) {
        return output.reply(
          `${NOTIF}\n${UNIRedux.standardLine}\nYou do not have an ${ABANK} ® account. Register with ${prefix}${commandName} register <nickname>.`
        );
      }
      const bet = args[1];
      let isRemoveT = bankData.bank === 0 && trophys.length > 0;
      let funds = !isRemoveT ? bankData.bank : Number.MAX_VALUE;

      let amount = parseBet(bet, funds);
      if (amount < funds * percentLimit) {
        return output.reply(
          `${NOTIF}\n${
            UNIRedux.standardLine
          }\nYou cannot withdraw a value lower than ${formatCash(
            Math.floor(funds * percentLimit)
          )}`
        );
      }

      if (isNaN(amount) || amount <= 0 || amount > funds) {
        return output.reply(
          `${NOTIF}\n${
            UNIRedux.standardLine
          }\nPlease provide a valid amount to withdraw. Your ${ABANK} ® balance is ${formatCash(
            funds
          )}.`
        );
      }

      userMoney += amount;
      if (userMoney >= Number.MAX_VALUE) {
        return output.reply(
          `${NOTIF}\n${UNIRedux.standardLine}\nYour balance might reach the maximum number limit.`
        );
      }
      funds -= amount;
      if (isRemoveT) {
        deductTrophy(userData);
      }

      bankData.bank = funds;
      cassExpress.bankOutLog(amount);
      await saveData({
        money: userMoney,
        awards: userData.awards,
        bankData,
        cassExpress: cassExpress.raw(),
      });
      return output.reply(
        `${isRemoveT ? `🏆❌ **Trophy Removed**\n` : ""}${
          UNIRedux.standardLine
        }\n${fonts.bold("Successfully")} withdrew:\n${formatCash(
          amount
        )}\nfrom your ${ABANK} ® account.`
      );
    },
    async deposit() {
      if (!bankData.nickname) {
        return output.reply(
          `${NOTIF}\n${UNIRedux.standardLine}\nYou do not have an ${ABANK} ® account. Register with ${prefix}${commandName} register <nickname>.`
        );
      }
      if (bankData.bank >= Number.MAX_VALUE) {
        return output.reply(
          `${NOTIF}\n${UNIRedux.standardLine}\nYour ${ABANK} ® account reached the maximum number limit.`
        );
      }
      const bet = args[1];
      let amount = parseBet(bet, userMoney);
      amount = Math.min(amount, Number.MAX_VALUE - amount);
      if (amount < userMoney * percentLimit) {
        return output.reply(
          `${NOTIF}\n${
            UNIRedux.standardLine
          }\nYou cannot deposit a value lower than ${formatCash(
            Math.floor(userMoney * percentLimit)
          )}`
        );
      }

      if (isNaN(amount) || amount <= 0 || amount > userMoney) {
        return output.reply(
          `${NOTIF}\n${
            UNIRedux.standardLine
          }\nPlease provide a valid amount to deposit. Your wallet balance is ${formatCash(
            userMoney
          )}.`
        );
      }
      userMoney -= amount;
      bankData.bank += amount;

      cassExpress.bankInLog(amount);
      await saveData({
        money: userMoney,
        bankData,
        cassExpress: cassExpress.raw(),
      });
      return output.reply(
        `${UNIRedux.standardLine}\n${fonts.bold(
          "Successfully"
        )} deposited:\n${formatCash(amount)}\nto your ${ABANK} ® account.`
      );
    },
    async transfer() {
      if (!bankData.nickname) {
        return output.reply(
          `${NOTIF}\n${UNIRedux.standardLine}\nYou do not have an ${ABANK} ® account. Register with ${prefix}${commandName} register <nickname>.`
        );
      }
      const recipientNickname = args[1];
      const bet = args[2];
      let amount = parseBet(bet, bankData.bank);
      if (amount < bankData.bank * percentLimit) {
        return output.reply(
          `${NOTIF}\n${
            UNIRedux.standardLine
          }\nYou cannot transfer a value lower than ${formatCash(
            Math.floor(bankData.bank * percentLimit)
          )}`
        );
      }
      if (!recipientNickname) {
        return output.reply(
          `${NOTIF}\n${UNIRedux.standardLine}\nPlease provide a valid recipient's nickname and amount to transfer. Usage: ${prefix}${commandName} transfer <nickname> <amount>`
        );
      }

      if (isNaN(amount) || amount <= 0) {
        return output.reply(
          `${NOTIF}\n${UNIRedux.standardLine}\nYou cannot transfer an invalid amount.`
        );
      }
      if (amount > bankData.bank) {
        return output.reply(
          `${NOTIF}\n${UNIRedux.standardLine}\nYou do not have enough value to transfer.`
        );
      }

      const recipient = await money.queryItem({
        "value.bankData.nickname": recipientNickname,
      });
      if (recipient?.bankData?.nickname !== recipientNickname) {
        return output.reply(
          `${NOTIF}\n${UNIRedux.standardLine}\nThe recipient does not have a ${ABANK} ® account with the given nickname.`
        );
      }

      if (recipient?.userID === input.senderID) {
        return output.reply(
          `${NOTIF}\n${UNIRedux.standardLine}\nYou cannot transfer any amount to your own ${ABANK} ® account.`
        );
      }

      const recipientID = recipient.userID;
      amount = Math.min(amount, Number.MAX_VALUE - amount);
      if (recipient.bankData.bank >= Number.MAX_VALUE) {
        return output.reply(
          `${NOTIF}\n${UNIRedux.standardLine}\nYour ${ABANK} ® account reached the maximum number limit.`
        );
      }
      bankData.bank -= amount;
      recipient.bankData.bank += amount;
      const rcassExpress = new CassExpress(recipient.cassExpress ?? {});

      cassExpress.bankOutLog(amount);
      rcassExpress.bankInLog(amount);

      await saveData(
        {
          money: userMoney,
          bankData,
          cassExpress: cassExpress.raw(),
        },
        input.senderID
      );
      await saveData(
        {
          money: recipient.money,
          bankData: recipient.bankData,
          cassExpress: rcassExpress.raw(),
        },
        recipientID
      );
      return output.reply(
        `${UNIRedux.standardLine}\n${fonts.bold(
          "Successfully"
        )} transferred: ${formatCash(amount)}\n${
          UNIRedux.standardLine
        }\n${fonts.bold("Receiver")}: ${formatTrophy(recipient)}\n➣ ${
          recipient.name
        }`
      );
    },
    async rename() {
      if (!bankData.nickname) {
        return output.reply(
          `${NOTIF}\n${UNIRedux.standardLine}\nYou do not have an ${ABANK} ® account. Register with ${prefix}${commandName} register <nickname>.`
        );
      }
      const newNickname = args[1];
      if (!newNickname || newNickname.length < 3) {
        return output.reply(
          `${NOTIF}\n${UNIRedux.standardLine}\nPlease provide a valid new nickname (at least 3 characters) for your ${ABANK} ® account.`
        );
      }
      bankData.nickname = newNickname;
      await saveData({
        money: userMoney,
        bankData,
        cassExpress: cassExpress.raw(),
      });
      return output.reply(
        `${UNIRedux.standardLine}\n${fonts.bold("Successfully")} renamed
        your ${ABANK} ® account to: ${newNickname}.`
      );
    },
    async top() {
      let page = parseInt(args[1]);
      if (!args[1] || isNaN(page)) {
        page = 1;
      }
      const per = 10;
      const allUsers = await money.getAll();
      const sortedUsers = Object.entries(allUsers)
        .filter(
          ([_, u]) =>
            typeof u.bankData?.bank === "number" && u.bankData?.nickname
        )
        .sort(
          ([, a], [, b]) =>
            b.bankData.bank * 1e-220 +
            Number.MAX_VALUE * 1e-220 * getTrophy(b).length -
            (a.bankData.bank * 1e-220 +
              Number.MAX_VALUE * 1e-220 * getTrophy(a).length)
        )
        .slice((page - 1) * per, page * per);
      let result = `${UNIRedux.standardLine}\n【 ${fonts.bold(
        "TOP"
      )} 10 ${fonts.bold("BANK BALANCES")} 】\n`;
      sortedUsers.forEach(([_, user], index) => {
        result += `━━━━━━ ${
          index + 1 + (page - 1) * per
        } ━━━━━━\n☐ ${fonts.bold("name")}: ${
          user.userMeta?.name ?? user.name
        }\n➥ ${formatTrophy(user)}\n${abbreviateNumber(
          user.bankData.bank,
          2,
          true
        )}\n`;
      });
      return output.reply(result);
    },
    async trophy() {
      if (!input.isAdmin) {
        return output.reply(
          `${NOTIF}\n${UNIRedux.standardLine}\nYou do not have an administrator-typed ${ABANK} ® account.`
        );
      }
      const recipientNickname = args[1];
      const allUsers = await money.getAll();
      const recipient = Object.values(allUsers).find(
        (u) => u.bankData?.nickname === recipientNickname
      );
      if (
        !recipient ||
        recipient?.userID === input.senderID ||
        !recipient.bankData?.bank
      ) {
        return output.reply(
          `${NOTIF}\n${UNIRedux.standardLine}\nThe recipient does not have a ${ABANK} ® account with the given nickname.`
        );
      }
      const recipientID = Object.keys(allUsers).find(
        (id) => allUsers[id].bankData?.nickname === recipientNickname
      );

      if (recipient.bankData.bank < Number.MAX_VALUE * 0.9) {
        return output.reply(
          `${NOTIF}\n${UNIRedux.standardLine}\nThe recipient does not deserve a trophy in ${ABANK} ®`
        );
      }
      await saveTrophy(recipient, saveData, recipientID);
      return output.reply(`🏆 **Success**!`);
    },
    async stalk() {
      let targetData = userData;
      const id = input.detectID ?? args[1];
      let isPeek = false;
      if (!id) {
        return output.reply(
          `${NOTIF}\n${UNIRedux.standardLine}\nPlease provide a user ID, nickname, or reply to a message to stalk a user.`
        );
      }
      if (id) {
        if (await money.exists(id)) {
          const da = await money.getItem(id);
          targetData = da;
          isPeek = true;
        } else {
          const target = await money.queryItem({
            "value.bankData.nickname": id,
          });
          if (target) {
            targetData = target;
            isPeek = true;
          }
        }
      }
      if (id && !isPeek) {
        return output.reply(
          `${NOTIF}\n${UNIRedux.standardLine}\nThis user does not have an existing ${ABANK} ® account.`
        );
      }

      return output.reply(
        `🏦 **STALKER** 👀\n${UNIRedux.standardLine}\nUserID: ${
          targetData.userID
        }\nNickname: ${formatTrophy(targetData)}\nName: ${
          targetData?.userMeta?.name ?? targetData.name
        }\nBalance: ${formatCash(targetData.bankData?.bank)}`
      );
    },
  };

  const targetHandler =
    handlers[
      Object.keys(handlers).find(
        (i) =>
          i === targetArgs ||
          (["r"].includes(targetArgs) && i === "register") ||
          (["c"].includes(targetArgs) && i === "check") ||
          (["w"].includes(targetArgs) && i === "withdraw") ||
          (["d"].includes(targetArgs) && i === "deposit") ||
          (["t"].includes(targetArgs) && i === "transfer") ||
          (["rn"].includes(targetArgs) && i === "rename") ||
          (["s"].includes(targetArgs) && i === "stalk")
      )
    ];
  if (typeof targetHandler === "function") {
    await targetHandler();
  } else {
    return output.reply(
      `🏦 ${ABANK} ®\n${UNIRedux.standardLine}\n${fonts.bold(
        "Usages"
      )}:\n➥ \`${prefix}${commandName} register/r <nickname>\` - Create a ${ABANK} ® account.\n➥ \`${prefix}${commandName} check/c <uid | reply | nickname>\` - Check your ${ABANK} ® balance.\n➥ \`${prefix}${commandName} withdraw/w <amount>\` - Withdraw money from your ${ABANK} ® account.\n➥ \`${prefix}${commandName} deposit/d <amount>\` - Deposit money to your ${ABANK} ® account.\n➥ \`${prefix}${commandName} transfer/t <nickName> <amount>\` - Transfer money to another user.\n➥ \`${prefix}${commandName} rename/rn\` - Rename your ${ABANK} ® nickname.\n➥ \`${prefix}${commandName} top <page=1>\` - Check the top 10 richest users of ${ABANK} ®.\n➥ \`${prefix}${commandName} stalk\` - Check someone's ${ABANK} ® balance.`
    );
  }
}
async function saveTrophy(
  recipient: UserData,
  saveData: (info: Partial<UserData>, id?: string) => Promise<void>,
  recipientID: string
) {
  recipient.awards ??= [];

  const awards: Award[] = recipient.awards;

  awards.push({
    type: limitKey,
    info: "Reached the Maximum!",
    date: Date.now(),
  });
  recipient.bankData.bank = 0;

  await saveData({ awards, bankData: recipient.bankData }, recipientID);
}
