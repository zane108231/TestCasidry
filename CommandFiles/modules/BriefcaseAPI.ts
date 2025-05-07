import { GearsManage, PetPlayer } from "@cass-plugins/pet-fight";
import { Inventory, Collectibles } from "@cassidy/ut-shop";
import { UNIRedux } from "cassidy-styler";
import {
  Config,
  Extra,
  SpectralCMDHome,
  SpectraMainConfig,
} from "./spectralCMDHome";
import { InventoryItem } from "./cassidyUser";
import { UNISpectra } from "./unisym";
import { parseBet } from "./ArielUtils";
const { parseCurrency: pCy } = global.utils;

export function listItem(
  item: Partial<InventoryItem> = {},
  count: number = undefined
) {
  return `${item.icon} **${item.name}**${
    typeof count === "number" && count > 1 ? ` (x${count})` : ""
  } [${item.key}]`;
}

export function groupItems(items: InventoryItem[]) {
  const itemCounts = new Map<string, InventoryItem & { amount: number }>();

  items.forEach((item) => {
    const key = item.key;
    if (itemCounts.has(key)) {
      itemCounts.set(key, { ...item, amount: itemCounts.get(key)?.amount + 1 });
    } else {
      itemCounts.set(key, {
        ...item,
        amount: 1,
      });
    }
  });
  return itemCounts;
}

export type BriefcaseAPIConfig = Config & {
  handler(
    ctx: CommandContext,
    extra: Extra,
    bcContext: BriefcaseAPIContext
  ): Promise<any> | any;
};

export interface BriefcaseAPIContext {
  instance: BriefcaseAPI;
  actionArgs: string[];
  getPetList(
    newData?: Inventory,
    newGear?: GearsManage,
    targetItem?: Partial<InventoryItem>,
    index?: number
  ): string;
  getDatas({ ...data }: UserData): {
    inventory: Inventory;
    petsData: Inventory;
    gearsData: GearsManage;
    collectibles: Collectibles;
  };
  inventory: Inventory;
  petsData: Inventory;
  gearsData: GearsManage;
  userData: UserData;
  listItem: typeof listItem;
  groupItems: typeof groupItems;
  iKey: string;
}

export type BriefcaseAPIExtraConfig = Partial<SpectraMainConfig> & {
  inventoryKey: string;
  ignoreFeature?: string[];
  inventoryName: string;
  inventoryIcon: string;
  inventoryLimit: number;
  showCollectibles: boolean;
};

export class BriefcaseAPI {
  extraConfig: BriefcaseAPIExtraConfig;
  extraItems: BriefcaseAPIConfig[];
  constructor(
    extraConfig: BriefcaseAPIExtraConfig,
    extraItems?: BriefcaseAPIConfig[] | undefined
  ) {
    extraConfig.inventoryKey ??= "inventory";
    extraConfig.isHypen ??= false;
    extraConfig.ignoreFeature ??= [];
    extraConfig.inventoryName ??= "Inventory";
    extraConfig.inventoryLimit ??= 36;
    extraConfig.inventoryIcon ??= "🎒";
    extraConfig.showCollectibles ??= true;
    this.extraConfig = extraConfig;
    this.extraItems = extraItems ?? [];
  }

  async runInContext(ctx: CommandContext) {
    const style = ctx.command.style ?? {};
    const {
      inventoryName,
      inventoryIcon,
      inventoryLimit,
      inventoryLimit: invLimit,
    } = this.extraConfig;
    const { input, output, money, prefix, generateTreasure, commandName } = ctx;
    const ikey = this.extraConfig.inventoryKey;

    let userData = await money.getCache(input.senderID);

    const getDatas: BriefcaseAPIContext["getDatas"] = function getDatas({
      ...data
    }) {
      const customInventory = new Inventory(data[ikey] ?? [], inventoryLimit);
      data.petsData ??= [];
      const petsData = new Inventory(data.petsData);
      const gearsData = new GearsManage(data.gearsData);
      const collectibles = new Collectibles(data.collectibles ?? []);
      return { inventory: customInventory, petsData, gearsData, collectibles };
    };

    let {
      inventory: customInventory,
      petsData,
      gearsData,
    } = getDatas(userData);

    const userDataCopy = userData;

    const a = UNIRedux.standardLine;

    const getPetList: BriefcaseAPIContext["getPetList"] = function getPetList(
      newData = petsData,
      newGear = gearsData,
      targetItem: Partial<InventoryItem> = {
        key: "",
        name: "",
        type: "",
        flavorText: "",
        icon: "",
      },
      index = 0
    ) {
      return newData
        .getAll()
        .map((pet) => {
          const gearData = newGear.getGearData(pet.key);
          const player = new PetPlayer(pet, gearData.toJSON());
          const gearDataAfter = gearData.clone();
          if (targetItem.type === "armor") {
            gearDataAfter.equipArmor(index, targetItem);
          } else if (targetItem.type === "weapon") {
            gearDataAfter.equipWeapon(targetItem);
          }
          const playerAfter = new PetPlayer(pet, gearDataAfter.toJSON());
          const atkDiff = playerAfter.ATK - player.ATK;
          const defDiff = playerAfter.DF - player.DF;
          const magicDiff = playerAfter.MAGIC - player.MAGIC;
          return `${player.getPlayerUI()}\nATK **${player.ATK} -> ${
            player.ATK + atkDiff
          }** (${atkDiff < 0 ? atkDiff : `+${atkDiff}`})\nDEF **${
            player.DF
          } -> ${player.DF + defDiff}** (${
            defDiff < 0 ? defDiff : `+${defDiff}`
          })\nMAGIC **${player.MAGIC} -> ${player.MAGIC + magicDiff}** (${
            magicDiff < 0 ? magicDiff : `+${magicDiff}`
          }) \n${a}\n⚔️ ${gearData.getWeaponUI()}\n🔰 ${gearData.getArmorUI(
            0
          )}\n🔰 ${gearData.getArmorUI(1)}`;
        })
        .join("\n" + a + "\n\n");
    };

    const actionArgs = this.extraConfig.isHypen
      ? input.arguments
      : input.arguments.slice(1);

    const bcContext: BriefcaseAPIContext = {
      actionArgs,
      getPetList,
      getDatas,
      inventory: customInventory,
      petsData,
      gearsData,
      userData,
      listItem,
      groupItems,
      iKey: ikey,
      instance: this,
    };
    const mappedExtra = this.extraItems.map((i) => {
      return {
        ...i,
        handler(ctx: CommandContext, extra: Extra) {
          return i.handler(ctx, extra, bcContext);
        },
      };
    });
    const self = this;

    const defaultFeatures: Config[] = [
      {
        key: "list",
        description: "Displays all items in the user's inventory.",
        aliases: ["-l"],
        args: ["<optional uid>"],
        async handler() {
          let userData = userDataCopy;
          let { inventory, collectibles } = getDatas(userData);
          let otherTarget = null;
          if (actionArgs[0]) {
            const target = await money.getCache(actionArgs[0]);
            if (!(await money.exists(actionArgs[0]))) {
              return output.reply(`User not found.`);
            }
            ({ inventory, petsData, gearsData, collectibles } =
              getDatas(target));
            otherTarget = target;
            userData = target;
          }
          const items = inventory.getAll();
          collectibles.register("money", {
            key: "money",
            name: "Money",
            flavorText: "This is what you have, anytime, anywhere.",
            icon: "💵",
            type: "currencyInv",
          });
          collectibles.register("puzzlePiece", {
            key: "puzzlePiece",
            name: "Puzzle Piece",
            flavorText: "Basically, Idk.",
            icon: "🧩",
            type: "currencyInv",
          });

          collectibles.set("money", userData.money);
          collectibles.set("puzzlePiece", userData.wordGameWins ?? 0);
          collectibles.removeEmpty();

          const categoryMap = new Map();
          for (const item of items) {
            const category = item.type;
            if (!categoryMap.has(category)) {
              categoryMap.set(category, []);
            }
            const map = categoryMap.get(category);
            map.push(item);
          }

          let itemList = ``;
          const sorted = Array.from(categoryMap).sort((a, b) =>
            a[0].localeCompare(b[0])
          );
          for (const [_, items] of sorted) {
            itemList += `${UNISpectra.charm} ${String(_)
              .toTitleCase()
              .toFonted("fancy_italic")}\n`;

            const itemCounts = new Map();

            items.forEach((item) => {
              const key = item.key;
              if (itemCounts.has(key)) {
                itemCounts.set(key, itemCounts.get(key) + 1);
              } else {
                itemCounts.set(key, 1);
              }
            });

            itemList += Array.from(itemCounts.entries())
              .map(([key, count]) => {
                const item = items.find((item) => item.key === key);
                return `${item.icon} **${item.name}**${
                  count > 1 ? ` (x${count})` : ""
                } [${item.key}]`;
              })
              .join("\n");

            itemList += `\n\n`;
          }
          let cllList = ``;
          if (self.extraConfig.showCollectibles) {
            const cllMap = new Map();
            for (const item of collectibles) {
              const category = item.metadata.type ?? "Uncategorized";
              if (!cllMap.has(category)) {
                cllMap.set(category, []);
              }
              const map = cllMap.get(category);
              map.push(item);
            }
            const sorted2 = Array.from(cllMap).sort((a, b) =>
              a[0].localeCompare(b[0])
            );
            for (const [_, items] of sorted2) {
              cllList += `${UNISpectra.charm} ${String(_)
                .toTitleCase()
                .toFonted("fancy_italic")}\n`;
              cllList += items
                .map(
                  ({ metadata, amount }) =>
                    `${metadata.icon} **${metadata.name}** ${
                      amount > 1 ? `(x${pCy(amount)}) ` : ""
                    }[${metadata.key}]`
                )
                .join("\n");
              cllList += "\n\n";
            }
          }
          const finalRes =
            (otherTarget
              ? `✅ Checking ${otherTarget.name ?? "Unregistered"}\n\n`
              : "") +
            `👤 **${userData.name}** (**${
              inventory.getAll().length
            }/${invLimit}**)\n\n${
              UNIRedux.arrow
            } ***${inventoryName} Items***\n\n${
              itemList.trim() || "No items available."
            }${
              self.extraConfig.showCollectibles
                ? `\n\n${UNIRedux.standardLine}\n${
                    UNIRedux.arrow
                  } ***Collectibles***\n\n${cllList.trim()}`
                : ""
            }`;

          let newRes = finalRes;

          return output.reply(newRes);
        },
      },
      {
        key: "inspect",
        description: "Shows detailed information about a specific item.",
        aliases: ["examine", "check", "look", "-i"],
        args: ["<item_id | index>"],
        async handler() {
          const keyToCheck = actionArgs[0];
          if (!keyToCheck) {
            return output.reply(
              `👤 **${
                userData.name || "Unregistered"
              }** (${inventoryName})\n\n` +
                `❌ No item specified! Reply with an **item key** to inspect.`
            );
          }
          const altKey = actionArgs
            .map((key, index) => {
              if (index !== 0) {
                return `${key.charAt(0)?.toUpperCase()}${key
                  .slice(1)
                  .toLowerCase()}`;
              } else {
                return key.toLowerCase();
              }
            })
            .join("");
          const lastKey = customInventory
            .getAll()
            .find((item) => item.name === actionArgs.join(" "))?.key;
          const item =
            customInventory.getOne(keyToCheck) ||
            customInventory.getOne(altKey) ||
            customInventory.getOne(lastKey);
          if (!item) {
            return output.reply(
              `👤 **${
                userData.name || "Unregistered"
              }** (${inventoryName})\n\n` +
                `❌ No treasure with key "**${keyToCheck}**" found in your pack!\n` +
                `Try "${prefix}${commandName} list" to see what’s in your ${inventoryIcon}!`
            );
          }
          return output.reply(
            `👤 **${userData.name || "Unregistered"}** (${inventoryName})\n\n` +
              `${UNIRedux.arrow} ***Item Details***\n\n` +
              `${item.icon} **${item.name}** (x${customInventory.getAmount(
                keyToCheck
              )})\n` +
              `✦ ${
                item.flavorText || "A curious item from your travels."
              }\n\n` +
              `Type: **${item.type}**\n` +
              `Heal: **${item.heal ?? 0} HP**\n` +
              `DEF: **+${item.def ?? 0}**\n` +
              `ATK: **+${item.atk ?? 0}**\n` +
              `Saturation: **${
                (Number(item.saturation) ?? 0) / 60 / 1000
              } mins** 🐾\n\n` +
              `Sell Price: **$${item.sellPrice ?? 0}** 💵`
          );
        },
      },
      {
        key: "use",
        description:
          "Uses or activates a specific item for its intended effect.",
        aliases: ["activate", "consume", "equip", "-u"],
        args: ["<item_id | index>"],
        async handler() {
          const [key] = actionArgs;

          if (!key) {
            return output.reply(
              `👤 **${
                userData.name || "Unregistered"
              }** (${inventoryName})\n\n` +
                `❌ No item chosen! Use an **item key** to activate something from your ${inventoryIcon}!`
            );
          }
          const eKey = "--unequip";
          let item = customInventory.getOne(key);
          if (!item && !String(key).startsWith(eKey)) {
            return output.reply(
              `👤 **${
                userData.name || "Unregistered"
              }** (${inventoryName})\n\n` +
                `❌ "**${key}**" isn’t in your pack! Check with "${prefix}${commandName} list".`
            );
          }

          item ??= {
            type: "generic",
            key: "__",
            flavorText: "",
            icon: "",
            name: "",
            sellPrice: 0,
            index: 0,
          };
          item.type ??= "generic";

          if (item?.type === "food") {
            return output.reply(
              `👤 **${
                userData.name || "Unregistered"
              }** (${inventoryName})\n\n` +
                `${UNIRedux.arrow} ***Food Item***\n\n` +
                `${item.icon} **${item.name}**\n` +
                `✦ A tasty morsel to **feed your pet**! More healing means more EXP for your loyal friend.\n` +
                `Try "${prefix}pet feed <pet_name> ${item.key}" to share the feast!`
            );
          }
          if (item?.type.endsWith("_food")) {
            const petType = item.type.replaceAll("_food", "");
            const durationMinutes = (
              (Number(item.saturation) ?? 0) / 60000
            ).toFixed(1);
            if (petType === "any") {
              return output.reply(
                `👤 **${
                  userData.name || "Unregistered"
                }** (${inventoryName})\n\n` +
                  `${UNIRedux.arrow} ***Food Item***\n\n` +
                  `${item.icon} **${item.name}**\n` +
                  `✦ A versatile treat for **any pet**! Keeps them full for **${durationMinutes} minutes**.\n` +
                  `Use "${prefix}pet feed <pet_name> ${item.key}" to satisfy any companion!`
              );
            } else {
              return output.reply(
                `👤 **${
                  userData.name || "Unregistered"
                }** (${inventoryName})\n\n` +
                  `${UNIRedux.arrow} ***Food Item***\n\n` +
                  `${item.icon} **${item.name}**\n` +
                  `✦ Specially crafted for **${petType}** pets! Fills them up for **${durationMinutes} minutes**.\n` +
                  `Feed it with "${prefix}pet feed <pet_name> ${item.key}"—if they match!`
              );
            }
          }

          if (item?.type === "pet") {
            return output.reply(
              `👤 **${
                userData.name || "Unregistered"
              }** (${inventoryName})\n\n` +
                `${UNIRedux.arrow} ***Caged Pet***\n\n` +
                `${item.icon} **${item.name}**\n` +
                `✦ A companion waiting to be free! Try uncaging it with "${prefix}pet uncage".\n` +
                `Who knows what adventures await?`
            );
          }

          if (
            item.type === "armor" ||
            item.type === "weapon" ||
            key.startsWith(eKey)
          ) {
            if (petsData.getAll().length === 0) {
              return output.reply(
                `👤 **${
                  userData.name || "Unregistered"
                }** (${inventoryName})\n\n` +
                  `❌ No pets to equip! Find a friend with "${prefix}pet shop" first!`
              );
            }
            const i = await output.reply(
              `👤 **${
                userData.name || "Unregistered"
              }** (${inventoryName})\n\n` +
                `${UNIRedux.arrow} ***Equip to a Pet***\n\n` +
                `✦ Pick a companion for **${item.icon} ${item.name}**!\n` +
                `(For armor, try "<pet_name> <slot_number>")\n\n` +
                `${getPetList(petsData, gearsData, item, 0)}`
            );
            input.setReply(i.messageID, {
              key: commandName,
              callback: handleEquip,
            });
            async function handleEquip(ctx) {
              if (ctx.input.senderID !== input.senderID) return;
              const userData = await ctx.money.get(ctx.input.senderID);
              const { inventory, petsData, gearsData } = getDatas(userData);
              item ??= {
                type: "generic",
                key: "__",
                flavorText: "",
                icon: "",
                name: "",
                sellPrice: 0,
                index: 0,
              };
              if (!key.startsWith(eKey) && !inventory.has(item.key)) {
                return ctx.output.reply(
                  `👤 **${
                    userData.name || "Unregistered"
                  }** (${inventoryName})\n\n` +
                    `❓ Where’d it go? "**${item.name}**" vanished from your ${inventoryIcon}!`
                );
              }

              const petName = String(ctx.input.words[0]);
              let slot = parseInt(ctx.input.words[1]) - 1;
              if (isNaN(slot)) slot = 0;
              let pet = petsData
                .getAll()
                .find(
                  (i) =>
                    String(i.name).toLowerCase().trim() ===
                    petName.toLowerCase().trim()
                );
              if (!pet) {
                return ctx.output.reply(
                  `👤 **${
                    userData.name || "Unregistered"
                  }** (${inventoryName})\n\n` +
                    `❌ No pet named "**${petName}**"! Check your crew with "${prefix}pet list".`
                );
              }
              const gearData = gearsData.getGearData(pet.key);
              const [, keyType] = key.split("_");
              item ??= {
                type: "generic",
                key: "__",
                flavorText: "",
                icon: "",
                name: "",
                sellPrice: 0,
                index: 0,
              };

              if (
                item.type === "armor" ||
                (key.startsWith(eKey) && keyType === "armor")
              ) {
                const oldArmor = gearData.equipArmor(
                  slot,
                  item.type === "armor" ? item : null
                );
                if (item.type === "armor") inventory.deleteOne(item.key);
                if (oldArmor) {
                  if (inventory.getAll().length >= invLimit) {
                    return ctx.output.reply(
                      `👤 **${
                        userData.name || "Unregistered"
                      }** (${inventoryName})\n\n` +
                        `❌ Your ${inventoryIcon} is stuffed! Make space with "${prefix}${commandName} toss".`
                    );
                  }
                  inventory.addOne(oldArmor);
                }
              } else if (
                item.type === "weapon" ||
                (key.startsWith(eKey) && keyType === "weapon")
              ) {
                const oldWeapon = gearData.equipWeapon(
                  item.type === "weapon" ? item : null
                );
                if (item.type === "weapon") inventory.deleteOne(item.key);
                if (oldWeapon) {
                  if (inventory.getAll().length >= invLimit) {
                    return ctx.output.reply(
                      `👤 **${
                        userData.name || "Unregistered"
                      }** (${inventoryName})\n\n` +
                        `❌ Your ${inventoryIcon} is stuffed! Make space with "${prefix}${commandName} toss".`
                    );
                  }
                  inventory.addOne(oldWeapon);
                }
              } else {
                return ctx.output.reply(
                  `👤 **${
                    userData.name || "Unregistered"
                  }** (${inventoryName})\n\n` +
                    `❌ Weird gear glitch! Use "**${eKey}_armor**" or "**${eKey}_weapon**" correctly.`
                );
              }
              gearsData.setGearData(pet.key, gearData);
              await ctx.money.set(ctx.input.senderID, {
                [ikey]: Array.from(inventory),
                gearsData: gearsData.toJSON(),
              });
              await ctx.output.replyStyled(
                `👤 **${
                  userData.name || "Unregistered"
                }** (${inventoryName})\n\n` +
                  `${UNIRedux.arrow} ***Equipped!***\n\n` +
                  `${item.type !== "generic" ? "✅" : "✦"} ${
                    item.icon || "⚙️"
                  } **${item.name || "Nothing"}** ${
                    item.type === "armor" || keyType === "armor"
                      ? "slipped onto"
                      : "swung by"
                  } **${pet.name}**!\n` +
                  `(Unequip with "${prefix}${commandName} use ${eKey}_${
                    item.type || keyType
                  }")\n\n` +
                  `${getPetList(petsData, gearsData, {}, 0)}`,
                style
              );
            }
            return;
          }
          if (item.type === "cheque") {
            let chequeKey = actionArgs[0];

            const itemToCash = customInventory.getOne(chequeKey);
            if (!itemToCash || itemToCash?.type !== "cheque") {
              return output.reply(
                `👤 **${
                  userData.name || "Unregistered"
                }** (${inventoryName})\n\n` +
                  `❌ No valid **cheque** with key "**${chequeKey}**" in your ${inventoryIcon}!`
              );
            }
            const chequeAmount = parseBet(Number(itemToCash.chequeAmount), 0);
            if (isNaN(chequeAmount) || chequeAmount <= 0) {
              return output.reply(
                `👤 **${
                  userData.name || "Unregistered"
                }** (${inventoryName})\n\n` +
                  `❌ This cheque’s a dud! No cash to claim.`
              );
            }
            customInventory.deleteOne(chequeKey);
            userData.money += chequeAmount;
            await money.setItem(input.senderID, {
              [ikey]: Array.from(customInventory),
              money: userData.money,
            });
            return output.reply(
              `👤 **${
                userData.name || "Unregistered"
              }** (${inventoryName})\n\n` +
                `${UNIRedux.arrow} ***Cashed Out***\n\n` +
                `✅ Turned ${itemToCash.icon || "💸"} **${
                  itemToCash.name
                }** into **$${chequeAmount}**!\n` +
                `Your pouch now holds **$${userData.money}** 💵.`
            );
          }
          if (item.type === "potion") {
            return output.reply(
              `👤 **${
                userData.name || "Unregistered"
              }** (${inventoryName})\n\n` +
                `${UNIRedux.arrow} ***Mystery Brew***\n\n` +
                `${item.icon || "🧪"} **${item.name}**\n` +
                `${
                  item.useText ||
                  "✦ A bubbling potion! Sip it, splash it, or... inject it? Who knows what magic awaits?"
                }`
            );
          }
          if (item.type !== "treasure") {
            const flavorText =
              item.useText ||
              `You fiddled with ${item.icon} **${item.name}**, but the magic fizzled out.`;
            return output.reply(
              `👤 **${
                userData.name || "Unregistered"
              }** (${inventoryName})\n\n` + `✅ ${flavorText}`
            );
          }
          let diaCost = 2;
          let tresCount = Number(item.tresCount) || 20;
          const author = input.senderID;
          let chosenNumbers = [];
          async function handleTriple(ctx) {
            const { input, output, money } = ctx;
            if (author !== ctx.input.senderID) return;
            const userData = await ctx.money.get(ctx.input.senderID);
            const { inventory, collectibles } = getDatas(userData);
            const { treasures, paidMode } = ctx.repObj;

            if (paidMode && !collectibles.hasAmount("gems", diaCost)) {
              return output.replyStyled(
                `👤 **${
                  userData.name || "Unregistered"
                }** (${inventoryName})\n\n` +
                  `❌ Out of gems! Need **${diaCost} 💎** to retry.`,
                style
              );
            }
            if (paidMode && String(input.words[0]).toLowerCase() !== "retry")
              return;
            if (paidMode) input.words.shift();

            if (!inventory.has(item.key) && !paidMode) {
              return output.replyStyled(
                `👤 **${
                  userData.name || "Unregistered"
                }** (${inventoryName})\n\n` +
                  `❌ The treasure’s gone! Did it slip out of your ${inventoryIcon}?`,
                style
              );
            }
            let number = parseInt(input.words[0]);
            if (chosenNumbers.includes(number)) {
              return output.reply(
                `👤 **${
                  userData.name || "Unregistered"
                }** (${inventoryName})\n\n` +
                  `❌ Already picked **${number}**! Choose another.`
              );
            }
            if (chosenNumbers.length >= tresCount) {
              return output.reply(
                `👤 **${
                  userData.name || "Unregistered"
                }** (${inventoryName})\n\n` +
                  `❌ All treasures claimed! Nothing left to open.`
              );
            }
            if (isNaN(number) || number < 1 || number > tresCount) {
              return output.reply(
                `👤 **${
                  userData.name || "Unregistered"
                }** (${inventoryName})\n\n` +
                  `❌ Pick a number between **1** and **${tresCount}**!`
              );
            }
            const treasure = treasures[number - 1];
            if (!treasure) {
              return output.reply(
                `👤 **${
                  userData.name || "Unregistered"
                }** (${inventoryName})\n\n` +
                  `❌ Treasure fizzled out! Something’s off...`
              );
            }
            if (inventory.getAll().length >= invLimit) {
              return output.reply(
                `👤 **${
                  userData.name || "Unregistered"
                }** (${inventoryName})\n\n` +
                  `❌ Your ${inventoryIcon} is full! Toss something with "${prefix}${commandName} toss".`
              );
            }
            inventory.addOne(treasure);
            if (paidMode) collectibles.raise("gems", -diaCost);
            const treasureItem = treasure;
            if (!paidMode) inventory.deleteOne(key);
            input.delReply(ctx.detectID);

            await money.set(input.senderID, {
              [ikey]: Array.from(inventory),
              collectibles: Array.from(collectibles),
            });
            chosenNumbers.push(number);

            const infoDone = await output.replyStyled(
              `👤 **${
                userData.name || "Unregistered"
              }** (${inventoryName})\n\n` +
                `${UNIRedux.arrow} ***Treasure Opened!***\n\n` +
                `${item.icon} Cracked open **${item.name}**!\n\n` +
                ` ${treasures
                  .map((i, index) =>
                    (index + 1) % 5 === 0 ? `${i.icon}\n` : i.icon
                  )
                  .join(" ")
                  .trim()}\n` +
                `${
                  collectibles.hasAmount("gems", diaCost)
                    ? `✦ Retry for **${diaCost} 💎**? Reply "retry <number>"!\n`
                    : ""
                }\n` +
                `${UNIRedux.arrow} ***Reward***\n` +
                `${treasureItem.icon} **${treasureItem.name}**\n` +
                `✦ ${treasureItem.flavorText}\n\n` +
                `Check it out with "${prefix}${commandName} check ${treasureItem.key}"!\n` +
                `Gems: **${pCy(collectibles.getAmount("gems"))} 💎** ${
                  paidMode ? `(-${diaCost})` : ""
                }`,
              style
            );
            treasures[number - 1] = { icon: "✅", isNothing: true };
            input.setReply(infoDone.messageID, {
              key: "inventory",
              callback: handleTriple,
              paidMode: true,
              treasures,
            });
          }

          let treasures = [];
          for (let i = 0; i < tresCount; i++) {
            let newTreasure;
            do {
              newTreasure = generateTreasure(String(item.treasureKey));
            } while (false);
            treasures.push(newTreasure);
          }
          treasures = treasures.sort(() => Math.random() - 0.5);
          const info = await output.reply(
            `👤 **${userData.name || "Unregistered"}** (${inventoryName})\n\n` +
              `${UNIRedux.arrow} ***Treasure Hunt***\n\n` +
              `✦ Pick a chest to unlock from **${item.name}**!\n\n` +
              ` ${Array(tresCount)
                .fill(item.icon)
                .map((i, index) => ((index + 1) % 5 === 0 ? `${i}\n` : i))
                .join(" ")
                .trim()}\n\n` +
              `Reply with a number from **1** to **${tresCount}**!`
          );
          input.setReply(info.messageID, {
            key: "inventory",
            callback: handleTriple,
            treasures,
          });
        },
      },
      {
        key: "transfer",
        description: "Sends an item to another user or entity.",
        aliases: ["give", "send", "-t"],
        args: ["<item_id | index>*<num|'all'>", "<uid>"],
        async handler() {
          let [keyTX = "", recipientID] = actionArgs;
          /**
           * @type {[string?, (string | number)?, ...a: any[]]}
           */
          let [keyT, amountItem = "1"]: [
            string?,
            (string | number)?,
            ...a: any[]
          ] = keyTX.split("*");

          if (!recipientID) {
            return output.reply(
              `👤 **${
                userData.name || "Unregistered"
              }** (${inventoryName})\n\n` + `❌ Missing recipient ID!`
            );
          }

          if (recipientID === input.senderID) {
            return output.reply(
              `👤 **${
                userData.name || "Unregistered"
              }** (${inventoryName})\n\n` +
                `❌ Can’t send to yourself! Your ${inventoryIcon} stays put.`
            );
          }
          if (!customInventory.has(keyT)) {
            return output.reply(
              `👤 **${
                userData.name || "Unregistered"
              }** (${inventoryName})\n\n` +
                `❌ No "**${keyT}**" in your pack! Double-check with "${prefix}${commandName} list".`
            );
          }
          if (amountItem === "all")
            amountItem = customInventory.getAmount(keyT);
          amountItem = parseInt(String(amountItem));
          if (isNaN(amountItem)) amountItem = 1;
          if (!customInventory.hasAmount(keyT, amountItem) || amountItem < 1) {
            return output.reply(
              `👤 **${
                userData.name || "Unregistered"
              }** (${inventoryName})\n\n` +
                `❌ Only have **${customInventory.getAmount(
                  keyT
                )}** of "**${keyT}**"! Adjust your gift amount.`
            );
          }

          const recipientData = await money.getCache(recipientID);
          if (!(await money.exists(recipientID))) {
            return output.reply(
              `👤 **${
                userData.name || "Unregistered"
              }** (${inventoryName})\n\n` +
                `❌ No one with ID "**${recipientID}**" exists! Who’s this mystery friend?`
            );
          }
          if (!recipientData.name) {
            return output.reply(
              `👤 **${
                userData.name || "Unregistered"
              }** (${inventoryName})\n\n` +
                `❌ Recipient’s nameless! Can’t send to a ghost.`
            );
          }
          const rInventory = new Inventory(recipientData[ikey], inventoryLimit);
          if (rInventory.getAll().length >= invLimit) {
            return output.reply(
              `👤 **${
                userData.name || "Unregistered"
              }** (${inventoryName})\n\n` +
                `❌ **${recipientData.name}**’s ${inventoryIcon} is stuffed full! They need to toss something.`
            );
          }
          if (
            rInventory.getAll().length + parseInt(String(amountItem)) >
            invLimit
          ) {
            return output.reply(
              `👤 **${
                userData.name || "Unregistered"
              }** (${inventoryName})\n\n` +
                `❌ **${recipientData.name}** has **${
                  rInventory.getAll().length
                }/${invLimit}** slots! Can’t fit **${amountItem}** more.`
            );
          }
          let sentItems = [];
          let failItems = [];
          let moneyAdd = 0;
          for (let i = 0; i < amountItem; i++) {
            const itemToSend = customInventory.getOne(keyT);
            if (itemToSend?.cannotSend) {
              failItems.push({
                ...itemToSend,
                error: `✦ This item’s stuck with you!`,
              });
              continue;
            }
            if (itemToSend.type === "cheque") {
              const amount = Number(itemToSend.chequeAmount);
              if (isNaN(amount) || amount < 1) {
                failItems.push({
                  ...itemToSend,
                  error: `✦ Cheque’s unreadable! No cash here.`,
                });
                continue;
              }
              moneyAdd += amount;
            } else {
              rInventory.addOne(itemToSend);
              sentItems.push(itemToSend);
            }
            customInventory.deleteRef(itemToSend);
          }

          await money.set(input.senderID, {
            [ikey]: Array.from(customInventory),
          });
          await money.set(recipientID, {
            [ikey]: Array.from(rInventory),
            money: recipientData.money + moneyAdd,
          });

          return output.reply(
            `👤 **${userData.name || "Unregistered"}** (${inventoryName})\n\n` +
              `${UNIRedux.arrow} ***Transfer Complete***\n\n` +
              `${
                moneyAdd > 0
                  ? `💰 Sent **$${moneyAdd}** 💵 via cheque to **${recipientData.name}**!\n`
                  : ""
              }` +
              `${
                sentItems.length > 0
                  ? `✅ Gifted **${sentItems.length}** treasures to **${recipientData.name}**!\n`
                  : `❌ No items sent to **${recipientData.name}**!\n`
              }` +
              `${[...sentItems, ...failItems]
                .map(
                  (i) =>
                    `${i.icon} **${i.name}**${i.error ? `\n${i.error}` : ""}`
                )
                .join("\n")}`
          );
        },
      },
      {
        key: "toss",
        description: `Discards an item from the user's ${inventoryName}.`,
        aliases: ["discard", "drop", "throw"],
        args: ["<item_id | index>*<num|'all'>"],
        async handler() {
          let [key, amount]: [string?, (string | number)?, ...a: any[]] = (
            actionArgs[0] ?? ""
          ).split("*");
          if (!amount && actionArgs[1]) amount = actionArgs[1];

          if (!key) {
            return output.reply(
              `👤 **${
                userData.name || "Unregistered"
              }** (${inventoryName})\n\n` +
                `❌ No item picked! Try "**cat*3**" to toss 3 cats—or whatever’s in your ${inventoryIcon}!`
            );
          }

          let items = customInventory.get(key);
          if (!items || items.length === 0) {
            return output.reply(
              `👤 **${
                userData.name || "Unregistered"
              }** (${inventoryName})\n\n` +
                `❌ Nothing with key "**${key}**" to toss! Peek with "${prefix}${commandName} list".`
            );
          }

          if (amount === "all") amount = items.length;
          else {
            amount = parseInt(amount, 10);
            if (isNaN(amount) || amount <= 0) {
              return output.reply(
                `👤 **${
                  userData.name || "Unregistered"
                }** (${inventoryName})\n\n` +
                  `❌ Bad amount "**${actionArgs[0]}**"! Use a number or "all".`
              );
            }
          }

          items = items.slice(0, amount);
          if (items.length < amount) {
            output.reply(
              `👤 **${
                userData.name || "Unregistered"
              }** (${inventoryName})\n\n` +
                `⚠️ Asked for **${amount}**, but only **${items.length}** "**${key}**" found!`
            );
          }

          const deletable = items.filter((i) => i.cannotToss !== true);
          const cannot = items.filter((i) => i.cannotToss === true);

          customInventory.deleteRefs(deletable);
          await money.set(input.senderID, {
            [ikey]: Array.from(customInventory),
          });

          let response =
            `👤 **${userData.name || "Unregistered"}** (${inventoryName})\n\n` +
            `${UNIRedux.arrow} ***Tossed Away***\n\n`;
          if (deletable.length > 0) {
            response +=
              `✅ Dropped **${deletable.length}** item${
                deletable.length !== 1 ? "s" : ""
              }:\n` +
              `${deletable.map((i) => `${i.icon} **${i.name}**`).join("\n")}\n`;
          }
          if (cannot.length > 0) {
            response +=
              `❌ Couldn’t toss **${cannot.length}** item${
                cannot.length !== 1 ? "s" : ""
              }:\n` +
              `${cannot.map((i) => `${i.icon} **${i.name}**`).join("\n")}\n`;
          }
          response += `Your ${inventoryIcon} now holds **${
            customInventory.getAll().length
          }/${invLimit}** items!`;
          return output.reply(response);
        },
      },
      {
        key: "top",
        description: "Check the top items or users with a specific one!",
        aliases: ["-t"],
        args: ["[all | <key>] [page=1]"],
        async handler() {
          const allUsers = await money.getAll();
          const page = parseInt(actionArgs[1] || "1") || 1;
          const perPage = 10;
          if (!Number.isNaN(parseInt(actionArgs[0]))) {
            return output.reply(
              `👤 **${
                userData?.name || "Unregistered"
              }** (${inventoryName})\n\n` +
                `❌ Invalid (buggy) item key! Try "all" or a specific item to check rankings.`
            );
          }

          if (!actionArgs[0] || actionArgs[0].toLowerCase() === "all") {
            const totals = new Map();
            for (const user of Object.values(allUsers)) {
              const userInventory = new Inventory(
                user[ikey] ?? [],
                inventoryLimit
              );
              const unique = [
                ...new Set(userInventory.getAll().map((i) => i.key)),
              ].map((key) => userInventory.getOne(key));
              for (const item of unique) {
                const amount = userInventory.getAmount(item.key);
                if (isNaN(amount)) continue;
                totals.set(item.key, (totals.get(item.key) ?? 0) + amount);
              }
            }

            const sorted = Array.from(totals.entries())
              .map(([key, amount]) => {
                const userWithItem = Object.values(allUsers).find((user) => {
                  const inv = new Inventory(user[ikey] ?? [], inventoryLimit);
                  return inv.has(key);
                });
                const userInventory = userWithItem
                  ? new Inventory(userWithItem[ikey] ?? [], inventoryLimit)
                  : null;
                const item = userInventory?.getOne(key) || {
                  name: key,
                  icon: "🧰",
                  key,
                };
                return { ...item, amount };
              })
              .sort((a, b) => b.amount - a.amount);

            const totalPages = Math.ceil(sorted.length / perPage);
            const paged = sorted.slice((page - 1) * perPage, page * perPage);

            if (!paged.length) {
              return output.reply(
                `👤 **${
                  userData?.name || "Unregistered"
                }** (${inventoryName})\n\n` + `No items found across the realm!`
              );
            }

            const list = paged
              .map(
                (item) =>
                  `${item.icon} **${item.name}** (x${pCy(item.amount)}) [${
                    item.key
                  }]`
              )
              .join("\n");

            return output.reply(
              `👤 **${
                userData?.name || "Unregistered"
              }** (${inventoryName})\n\n` +
                `${UNIRedux.arrow} ***Top Items*** [all] [page=${page}/${totalPages}]\n\n` +
                `${list}\n\n` +
                `${UNIRedux.arrowFromT} Flip pages with '${prefix}${commandName} top all <page>'\n` +
                `${UNIRedux.arrowFromT} Check specific rankings with '${prefix}${commandName} top <key> <page>'`
            );
          } else {
            const key = actionArgs[0];
            const usersWithKey = Object.entries(allUsers)
              .map(([uid, data]) => {
                const userInventory = new Inventory(
                  data[ikey] ?? [],
                  inventoryLimit
                );
                const amount = userInventory.getAmount(key);
                if (isNaN(amount) || amount <= 0) return null;
                const item = userInventory.getOne(key) || {
                  name: key,
                  icon: "🧰",
                };
                return {
                  uid,
                  name: data.name || "Unregistered",
                  amount,
                  icon: item.icon,
                  metadata: item,
                };
              })
              .filter(Boolean)
              .sort((a, b) => b.amount - a.amount);

            const totalPages = Math.ceil(usersWithKey.length / perPage);
            const paged = usersWithKey.slice(
              (page - 1) * perPage,
              page * perPage
            );

            if (!paged.length) {
              return output.reply(
                `👤 **${
                  userData?.name || "Unregistered"
                }** (${inventoryName})\n\n` + `No one’s got **${key}** yet!`
              );
            }

            const list = paged
              .map(
                (user, i) =>
                  `${UNIRedux.arrow} ${i + 1}. ${user.name} ${user.icon}\n` +
                  `${UNIRedux.arrowFromT} **${user.metadata.name}**: ${pCy(
                    user.amount
                  )}`
              )
              .join("\n\n");

            return output.reply(
              `👤 **${
                userData?.name || "Unregistered"
              }** (${inventoryName})\n\n` +
                `${UNIRedux.arrow} ***Top Holders of ${key}*** [page=${page}/${totalPages}]\n\n` +
                `${list}\n\n` +
                `${UNIRedux.arrowFromT} See more with '${prefix}${commandName} top ${key} <page>'`
            );
          }
        },
      },
      {
        key: "trade",
        description: "Propose a trade of items with another user or anyone.",
        aliases: ["-tr"],
        args: ["<uid|'any'>", "<your_item_id>*<num>", "<their_item_id>*<num>"],
        async handler() {
          if (actionArgs.length < 3) {
            return output.reply(
              [
                `${prefix}${commandName}-trade`,
                "<uid|'any'>",
                "<your_item_id>*<num>",
                "<their_item_id>*<num>",
              ].join(" ")
            );
          }
          const [recipientID = "", yourItem = "", theirItem = ""] = actionArgs;
          const [yourKey, yourAmount = "1"] = yourItem.split("*");
          const [theirKey, theirAmount = "1"] = theirItem.split("*");

          const yourNum = parseInt(yourAmount);
          const theirNum = parseInt(theirAmount);

          if (!yourKey || customInventory.getAmount(yourKey) === 0) {
            return output.reply(
              `❌ Item "${yourKey}" is missing or not in your ${inventoryIcon}!`
            );
          }

          if (!customInventory.hasAmount(yourKey, yourNum)) {
            return output.reply(
              `❌ You don't have enough "${yourKey}" (have ${customInventory.getAmount(
                yourKey
              )}) in your ${inventoryIcon}!`
            );
          }

          if (!theirKey) {
            return output.reply(`❌ Specify an item to receive!`);
          }

          const isAnyTrade = recipientID === "any";
          let recipientData: UserData = null;
          let rInventory: Inventory = null;

          if (!isAnyTrade) {
            if (recipientID === input.senderID) {
              return output.reply(`❌ Can't trade with yourself!`);
            }
            recipientData = await money.getCache(recipientID);
            if (!(await money.exists(recipientID))) {
              return output.reply(`❌ User "${recipientID}" not found!`);
            }
            rInventory = new Inventory(
              recipientData[bcContext.iKey],
              self.extraConfig.inventoryLimit
            );
            if (rInventory.getAmount(theirKey) === 0) {
              return output.reply(
                `❌ Recipient doesn't have "${theirKey}" in their ${inventoryIcon}!`
              );
            }
            if (!rInventory.hasAmount(theirKey, theirNum)) {
              return output.reply(
                `❌ Recipient doesn't have enough "${theirKey}" (has ${rInventory.getAmount(
                  theirKey
                )}) in their ${inventoryIcon}!`
              );
            }
          }

          const tradeMessage = await output.reply(
            `📬 **Trade Proposal** ${
              isAnyTrade ? "to anyone" : `to ${recipientData.name}`
            }!\n` +
              `You give: ${listItem(
                customInventory.getOne(yourKey),
                yourNum
              )}\n` +
              `You get: ${listItem(
                rInventory?.getOne(theirKey) ||
                  customInventory.getOne(theirKey) || {
                    key: theirKey,
                    name: "(Unknown ???)",
                    icon: "❓",
                  },
                theirNum
              )}\n` +
              `Reply "accept" or "decline".`
          );

          input.setReply(tradeMessage.messageID, {
            key: "trade",
            callback: async (ctxRep) => {
              const responderID = ctxRep.input.senderID;
              if (responderID === input.senderID) {
                return ctxRep.output.replyStyled(
                  `❌ You can't accept your own trade!`,
                  style
                );
              }

              if (!isAnyTrade && responderID !== recipientID) {
                return ctxRep.output.replyStyled(
                  `❌ Only ${recipientData.name} can accept this trade!`,
                  style
                );
              }

              const senderInventory = new Inventory(
                (await money.getCache(input.senderID))[bcContext.iKey],
                self.extraConfig.inventoryLimit
              );
              const responderData = await money.getCache(responderID);
              if (!(await money.exists(responderID))) {
                return ctxRep.output.replyStyled(
                  `❌ User ${responderData?.name || "Unregistered"} not found!`,
                  style
                );
              }

              if (ctxRep.input.words[0].toLowerCase() !== "accept") {
                return ctxRep.output.replyStyled(
                  `❌ Trade declined by ${
                    responderData?.name || "Unregistered"
                  }.`,
                  style
                );
              }
              const responderInventory = new Inventory(
                responderData[bcContext.iKey],
                self.extraConfig.inventoryLimit
              );

              if (!senderInventory.hasAmount(yourKey, yourNum)) {
                return ctxRep.output.replyStyled(
                  `❌ Trade failed: You no longer have enough "${yourKey}" (have ${senderInventory.getAmount(
                    yourKey
                  )}) in your ${inventoryIcon}!`,
                  style
                );
              }

              if (responderInventory.getAmount(theirKey) === 0) {
                return ctxRep.output.replyStyled(
                  `❌ Trade failed: ${responderData.name} doesn't have "${theirKey}" in their ${inventoryIcon}!`,
                  style
                );
              }
              if (!responderInventory.hasAmount(theirKey, theirNum)) {
                return ctxRep.output.replyStyled(
                  `❌ Trade failed: ${
                    responderData.name
                  } doesn't have enough "${theirKey}" (has ${responderInventory.getAmount(
                    theirKey
                  )}) in their ${inventoryIcon}!`,
                  style
                );
              }

              if (
                senderInventory.getAll().length + theirNum >
                self.extraConfig.inventoryLimit
              ) {
                return ctxRep.output.replyStyled(
                  `❌ Trade failed: Your ${inventoryIcon} can't hold ${theirNum} more items (limit: ${self.extraConfig.inventoryLimit})!`,
                  style
                );
              }
              if (
                responderInventory.getAll().length + yourNum >
                self.extraConfig.inventoryLimit
              ) {
                return ctxRep.output.replyStyled(
                  `❌ Trade failed: ${responderData.name}'s ${inventoryIcon} can't hold ${yourNum} more items (limit: ${self.extraConfig.inventoryLimit})!`,
                  style
                );
              }

              for (let i = 0; i < yourNum; i++) {
                responderInventory.addOne(senderInventory.getOne(yourKey));
                senderInventory.deleteOne(yourKey);
              }

              for (let i = 0; i < theirNum; i++) {
                senderInventory.addOne(responderInventory.getOne(theirKey));
                responderInventory.deleteOne(theirKey);
              }

              await money.setItem(input.senderID, {
                [bcContext.iKey]: Array.from(senderInventory),
              });
              await money.setItem(responderID, {
                [bcContext.iKey]: Array.from(responderInventory),
              });
              input.delReply(String(ctxRep.detectID));

              return ctxRep.output.replyStyled(
                `✅ Trade completed!\n` +
                  `${userData.name} got ${listItem(
                    senderInventory.getOne(theirKey),
                    theirNum
                  )}\n` +
                  `${responderData.name} got ${listItem(
                    responderInventory.getOne(yourKey),
                    yourNum
                  )}`,
                style
              );
            },
          });
        },
      },
      {
        key: "sell",
        description: "Sell one or more items for their monetary value.",
        aliases: ["-s"],
        args: ["<item_id>*<num|'all'>..."],
        async handler() {
          if (!actionArgs.length) {
            return output.reply(`❌ Specify an item to sell!`);
          }

          let totalMoney = 0;
          const soldItems = [];
          const errors = [];

          for (const arg of actionArgs) {
            let [key, amount_ = "1"] = arg?.split("*") || [];
            let amount = parseInt(amount_);

            if (!key) {
              errors.push(`❌ Specify an item to sell!`);
              continue;
            }

            const items = customInventory.get(key);
            if (!items.length) {
              errors.push(`❌ No "${key}" in your ${inventoryIcon}!`);
              continue;
            }

            if (amount_ === "all") amount = items.length;
            amount = parseInt(String(amount));
            if (isNaN(amount) || amount < 1 || amount > items.length) {
              errors.push(
                `❌ Invalid amount! You have ${items.length}x ${key} in your ${inventoryIcon}!`
              );
              continue;
            }

            const sellItems = items.slice(0, amount);
            let itemMoney = 0;
            sellItems.forEach((item) => {
              if (item.cannotSell) {
                return;
              }
              if (isNaN(item.sellPrice)) {
                return;
              }
              itemMoney += item.sellPrice || 0;
              customInventory.deleteRef(item);
            });

            if (itemMoney === 0) {
              errors.push(`❌ These "${key}" items can't be sold!`);
              continue;
            }

            totalMoney += itemMoney;
            soldItems.push(
              `${listItem(items[0], amount)} - **$${itemMoney}💵**`
            );
          }

          if (!soldItems.length && errors.length) {
            return output.reply(errors.join("\n"));
          }

          if (totalMoney > 0) {
            userData.money += totalMoney;
            await money.setItem(input.senderID, {
              [ikey]: Array.from(customInventory),
              money: userData.money,
            });
          }

          let response =
            `${UNISpectra.arrow} ***Sold***\n\n${soldItems.join("\n")}\n\n` +
            `✅ Total: **$${totalMoney}**\n` +
            `💰 Your new balance: **$${userData.money}💵**.`;
          if (errors.length) {
            response += `\n\n${errors.join("\n")}`;
          }

          return output.reply(response);
        },
      },
    ].filter((i) => !this.extraConfig.ignoreFeature.includes(i.key));
    const home = new SpectralCMDHome(
      {
        isHypen: false,
        ...this.extraConfig,
      },
      [...defaultFeatures, ...mappedExtra]
    );
    return home.runInContext(ctx);
  }
}
