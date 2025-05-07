/*
  WARNING: This source code is created by Liane Cagara.
  Any unauthorized modifications or attempts to tamper with this code 
  can result in severe consequences, including a global ban from my server.
  Proceed with extreme caution and refrain from any unauthorized actions.
*/

import axios from "axios";
import { CassEXP } from "../modules/cassEXP.js";
import { translate, UNIRedux, UNISpectra } from "@cassidy/unispectra";
import { PagePayload } from "@cass-modules/PageButton";
import { TempFile } from "../../handlers/page/sendMessage";
import { base64ToStream, streamToBase64 } from "../../webSystem";
import { NeaxScript } from "@cass-modules/NeaxScript";
import InputClass from "@cass-modules/InputClass";
import { inspect } from "util";

export const meta = {
  name: "output",
  author: "Liane Cagara",
  version: "1.0.1",
  description: "Output is a plugin that simplifies output responses.",
  supported: "^1.0.0",
  order: 3,
  IMPORTANT: true,
  type: "plugin",
  after: ["input"],
  expect: ["CassidyIO", "output", "outputOld", "AutoEdit", "cassIO"],
};
const { delay } = global.utils;

export const style = {
  title: "🦋 Example Title",
  contentFont: "fancy",
  titleFont: "bold",
};

/**
 * @implements {import("output-cassidy").OutputResultInf}
 */
export class OutputResult {
  /**
   * @type {CommandContext}
   */
  #ctx;
  /**
   *
   * @param {CommandContext} ctx
   * @param {import("output-cassidy").OutputResultInf} result
   */
  constructor(ctx, result) {
    Object.assign(this, result);

    this.#ctx = ctx;
    this.result = result;
    this.messageID = this.result.messageID;
    this.body = this.result.body;
    this.attachment = this.result.attachment;
    this.callback = this.result.callback;
    this.defStyle = this.result.defStyle;
    this.html = this.result.html;
    this.isReply = this.result.isReply;
    this.location = this.result.location;
    this.mentions = this.result.mentions;
    this.messageID = this.result.messageID;
    this.noLevelUI = this.result.noLevelUI;
    this.noStyle = this.result.noStyle;
    this.originalOptionsBody = this.result.originalOptionsBody;
    this.referenceQ = this.result.referenceQ;
    this.senderID = this.result.senderID;
    this.style = this.result.style;
    this.styleFields = this.result.styleFields;
    this.threadID = this.result.threadID;
    this.timestamp = this.result.timestamp;
  }

  /**
   *
   * @param {Parameters<import("output-cassidy").OutputProps["addReplyListener"]>[1]} callback
   */
  atReply(callback) {
    if (typeof callback !== "function") {
      throw new TypeError("Callback is not a function.");
    }

    return this.#ctx.output.addReplyListener(this.messageID, callback);
  }

  /**
   *
   * @param {Parameters<import("output-cassidy").OutputProps["addReactionListener"]>[1]} callback
   */
  atReaction(callback) {
    if (typeof callback !== "function") {
      throw new TypeError("Callback is not a function.");
    }

    return this.#ctx.output.addReactionListener(this.messageID, callback);
  }

  /**
   * @param {Parameters<import("output-cassidy").OutputProps["edit"]>[0]} text
   * @param {Parameters<import("output-cassidy").OutputProps["edit"]>[2]} delay
   * @param {Parameters<import("output-cassidy").OutputProps["edit"]>[3]} style
   */
  editSelf(text, delay = undefined, style = undefined) {
    return this.#ctx.output.edit(text, this.messageID, delay, style);
  }

  unsendSelf() {
    return this.#ctx.output.unsend(this.messageID);
  }
}

export class CassidyIO {
  input;
  output;

  /**
   * @param {import("@cass-modules/InputClass").InputClass} input
   * @param {import("output-cassidy").OutputProps} output
   * @param {any} style
   */
  constructor(input, output, style) {
    this.input = input;
    this.output = output;
    this.lastMessageID = null;
    this.style = style;
  }
  /**
   * @param {string} text
   * @param {string | undefined} sendID
   */
  async out(text, sendID = undefined) {
    text = String(text.body ?? text);
    let info;
    if (sendID) {
      info = await this.output.sendStyled(text, this.style, sendID);
    } else {
      info = await this.output.replyStyled(text, this.style);
    }
    this.lastMessageID = info.messageID;
    return info;
  }
  async in({
    messageID: optionalID = this.lastMessageID,
    full,
    dontUpdate,
    callback: c = (ctx) => ctx.repObj.resolve(ctx),
    test,
    testFail,
  } = {}) {
    let callback = c;

    if (test) {
      callback = async (ctx) => {
        let { repObj, input } = ctx;
        if (await test(input)) {
          await c(ctx);
        } else if (testFail) {
          await testFail(ctx);
        }
      };
    }
    const ctx = await this.output.addReplyListener(
      optionalID ?? this.lastMessageID,
      callback
    );
    if (!dontUpdate) {
      this.output = ctx.output;
      this.input = ctx.input;
    }
    return full ? ctx : ctx.input;
  }
}

/**
 *
 * @param {CommandContext} obj
 */
export async function use(obj) {
  let LASTID = null;
  try {
    obj.CassidyIO = CassidyIO;
    const { api, event, command: cmd, commands, input } = obj;
    let append = "";
    let prepend = "";
    let uiName = null;

    /**
     *
     * @param {import("output-cassidy").StrictOutputForm} options     */
    async function processOutput({ ...options }) {
      const { UserStatsLocal, money, CassEncoder } = obj;
      const command = cmd;
      if (
        command?.meta?.noRibbonUI !== true &&
        global.Cassidy.config.noRibbonUI !== true &&
        obj.money &&
        options.noRibbonUI !== true
      ) {
        let hasS = Boolean(input.senderID);
        const { name } = await obj.money.getCache(
          options.threadID ?? input.senderID
        );
        const finalName = uiName || name;
        let isOther = finalName !== name;

        if (options.body && !options.body.trim().startsWith("👤")) {
          options.body =
            hasS && finalName && finalName !== "Unregistered"
              ? `👤 **${finalName}**${
                  obj.command && !isOther ? ` (${obj.input.words[0]})` : ""
                }\n\n${options.body}`
              : `🍃 Register with **${obj.prefix}id-setname** now!\n\n${options.body}`;
        }
      }

      if (
        command?.meta?.noLevelUI !== true &&
        global.Cassidy.config.noLevelUI !== true &&
        obj.money &&
        options.noLevelUI !== true
      ) {
        let hasS = Boolean(input.senderID);
        const {
          cassEXP,
          name,
          money: userMoney,
          inventory = [],
          boxItems = [],
        } = await obj.money.getCache(options.threadID ?? input.senderID);
        const inst = new CassEXP(cassEXP);
        const finalName = uiName || name;
        let isOther = finalName !== name;

        options.body =
          hasS && finalName
            ? `${options.body}\n${UNIRedux.standardLine}\n${
                UNIRedux.arrow
              } ***Level*** ${UNISpectra.nextArrow} ${inst.level} [${
                inst.exp
              } / ${inst.getNextEXP()}]`
            : options.body;
      }

      return options.body;
    }

    /**
     *
     * @param {import("output-cassidy").OutputForm} text
     * @param {import("output-cassidy").OutputForm} options
     * @returns {Promise<import("output-cassidy").OutputResult>}
     */
    async function output(text, options = { body: "" }) {
      const styler = obj.input.isCommand ? obj.styler : obj.stylerDummy;
      const newMid = `web:mid-${Date.now()}`;
      if (typeof text === "object") {
        Object.assign(options, text);
      } else if (typeof text === "string") {
        Object.assign(options, {
          body: text,
        });
      } else if (!text) {
        Object.assign(options, {
          body: "",
        });
      }
      let resultInfo = {};
      let isStr = (str) => typeof str === "string";
      if (!isStr(options)) {
        options.body ??= "";
        resultInfo.originalOptionsBody = options.body;
        if (Cassidy.config.autoGoogleTranslate) {
          try {
            options.body = (
              await translate(options.body, Cassidy.config.autoGoogleTranslate)
            )?.text;
          } catch (error) {
            console.error(error);
          }
        }
        if (PagePayload.isPageButton(options.attachment) && !obj.input.isPage) {
          const buttons = PagePayload.fromPayload(options.attachment);
          options.body = buttons.toString();
        }
        if (PagePayload.isPageButton(options.attachment)) {
          delete options.body;
        }
        if (global.Cassidy.config.censorOutput && options.body) {
          options.body = input.censor(options.body);
        }
        // console.log(options);
        const { UserStatsLocal, money, CassEncoder } = obj;
        const { replies = {} } = global.Cassidy;
        // @ts-ignore
        const { currData } = global;
        let repCommand;
        if (input.replier && replies[input.replier.messageID]) {
          const { commandKey } = replies[input.replier.messageID];
          repCommand =
            commands[commandKey] || commands[commandKey.toLowerCase()];
        }

        let command = cmd || repCommand || currData;
        options.body = `${prepend}\n${options.body}\n${append}`;
        options.body = options.body.trim();

        const stylerShallow = styler.shallowMake(
          Object.assign({}, options.defStyle ?? {}, input.defStyle ?? {}),
          Object.assign({}, options.style ?? {}, input.style ?? {})
        );

        if (options.body) {
          options.body = await processOutput(options);
        }

        if (!options.noStyle && options.body) {
          options.body = UNISpectra.standardizeLines(options.body);

          options.body = input.isWss
            ? stylerShallow.html(resultInfo.originalOptionsBody) +
              "==========>" +
              stylerShallow.text(resultInfo.originalOptionsBody)
            : stylerShallow.text(options.body);
          resultInfo.html = stylerShallow.html(resultInfo.originalOptionsBody);
          resultInfo.styleFields = styler.getFields();
        } else {
          resultInfo.html = options.body;
        }
        if (options.noStyle) {
          delete options.noStyle;
        }
        if (options.body && global.Cassidy.config.standardSpectra) {
          options.body = UNISpectra.standardizeLines(options.body);
        }

        options.body = options.body.trim();
        const optionsCopy = { ...options };
        for (const key in options) {
          if (
            ![
              "attachment",
              "attachments",
              "body",
              "location",
              "mentions",
            ].includes(key)
          ) {
            resultInfo[key] = options[key];
            delete options[key];
          }
        }
        if (
          !options.body ||
          (options.body === "") | (String(options.body).trim() === "") ||
          options.body === "undefined"
        ) {
          delete options.body;
        }

        if (options.rawBody) {
          options.body = resultInfo.originalOptionsBody;
        }

        //console.log(options);

        if (options.referenceQ === input.webQ) {
        }
        if (input.isWeb) {
          // console.log("Q", input.webQ, global.webQuery);

          let url = null;
          if (
            typeof options.attachment === "object" &&
            options.attachment &&
            "_readableState" in options.attachment
          ) {
            const temp = new TempFile();
            const { fileTypeFromStream, fileTypeFromBuffer } =
              await global.fileTypePromise;
            const base64_ = await streamToBase64(options.attachment);
            const buffer = Buffer.from(base64_, "base64");
            const type = await fileTypeFromBuffer(buffer);
            let format = type?.ext;
            const newStream = base64ToStream(base64_);

            temp.filename = temp.filename.replace("tmp", format);
            await temp.save(newStream);
            // url = `${
            //   global.Cassidy.config.knownURL
            // }/api/temp?id=${encodeURIComponent(temp.getFilename())}`;
            url = `/api/temp?id=${encodeURIComponent(temp.getFilename())}`;
          }

          const toR = new OutputResult(obj, {
            ...options,
            ...resultInfo,
            messageID: newMid,
            timestamp: Date.now(),
            senderID: api.getCurrentUserID(),
            threadID: options.threadID || event.threadID,
            attachment: url ?? null,
          });

          for (const kk of [input.webQ]) {
            if (!kk || !global.webQuery[kk]) {
              continue;
            }
            let modifiedData = null;

            global.webQuery[kk].resolve({
              status: "success",
              result: { ...toR },
              newMid,
              modifiedData,
            });
            //console.log(`Resolved message to ${input.webQ} with mid: ${newMid}`);
          }
          // console.log("WEB Res", toR);
          return new Promise((r) => {
            LASTID = toR.messageID;
            r(toR);
          });
        }
        return new Promise((res) => {
          api.sendMessage(
            options,
            optionsCopy.threadID || event.threadID,
            async (err, info) => {
              if (typeof optionsCopy.callback === "function") {
                await optionsCopy.callback(info);
              }

              if (err) {
                console.log(err);
                //return rej(err);
              }

              const resu = new OutputResult(obj, {
                ...options,
                ...info,
                ...resultInfo,
                senderID: api.getCurrentUserID() || "",
                body: options.body,
              });
              LASTID = resu.messageID;
              // console.log("API RESU", resu);
              res(resu);
            },
            optionsCopy.messageID ||
              (optionsCopy.isReply ? event.messageID : null)
          );
        });
      } else {
        throw new Error("Something is wrong.");
      }
    }

    /**
     * @type {Partial<import("output-cassidy").OutputProps>}
     */
    const outputProps = {
      async req(url, params = {}, configOrMethod = "GET") {
        let finalUrl = url;

        /**
         * @type {import("axios").AxiosRequestConfig}
         */
        let finalConfig =
          typeof configOrMethod !== "string"
            ? configOrMethod
            : { method: String(configOrMethod).toUpperCase() };

        if (finalUrl.startsWith("@")) {
          let [method, ...uurl] = finalUrl.slice(1).split(":");
          finalUrl = uurl.join(":");
          finalConfig.method = String(method).toUpperCase();
        }
        if (finalConfig.method === "POST") {
          finalConfig.data = params;
        } else {
          finalConfig.params = params;
        }
        try {
          const res = await axios(finalUrl, finalConfig);
          return res.data;
        } catch (error) {
          throw new Error(
            error instanceof Error ? error.message : String(error)
          );
        }
      },
      async reply(body, callback) {
        if (typeof body === "function") {
          if (!LASTID) {
            throw new Error("No last output to attach to.");
          }
          return obj.output.addReplyListener(LASTID, body);
        }
        return await output(body, { callback, isReply: true });
      },
      async attach(body, stream, style) {
        const awaited =
          typeof stream === "string"
            ? await global.utils.getStreamFromUrl(stream)
            : stream;
        let form1 = typeof body === "string" ? { body } : { ...body };
        let form = {
          ...form1,
          attachment: awaited,
        };
        if (style) {
          return outputProps.replyStyled(form, style);
        }
        return outputProps.reply(form);
      },
      async setUIName(name) {
        uiName = String(name);
      },
      async contact(text, id, destination) {
        return new Promise(async (res, rej) => {
          await api.shareContact(
            text || "",
            id || input.senderID,
            destination || input.threadID,
            (err) => {
              if (err) {
                return rej(err);
              }
              res(true);
            }
          );
        });
      },
      async error(err, callback) {
        let error = err;
        if (typeof error !== "object" && typeof error !== "string") {
          throw new Error(
            `The first argument must be an Error instance or a string.`
          );
        }
        if (typeof error === "string") {
          error = new Error(`${error}`);
        }
        const errMsg = formatError(error);
        return await output(errMsg, { callback, isReply: true });
      },
      async wentWrong() {
        return await output(
          "❌ Sorry, something went wrong. This message indicates that an **unexpected issue has occurred**, which may lead to potential problems if not addressed. **It is uncommon to see this message**, as it is primarily used for rapid edge case handling and debugging. Better error messages will be added in the **future**. Please **report** this to the administrator or developer for further investigation.",
          { isReply: true }
        );
      },
      async send(body, id, callback) {
        return await output(body, { callback, threadID: id });
      },
      async add(user, thread = event.threadID) {
        api.addUserToGroup(user, thread, (err) => {});
      },
      async kick(user, thread = event.threadID) {
        api.removeUserFromGroup(user, thread, (err) => {});
      },
      async unsend(mid) {
        api.unsendMessage(mid, (err) => {});
      },
      async reaction(emoji, mid = event.messageID) {
        if (typeof emoji === "function") {
          if (!LASTID) {
            throw new Error("No last output to attach to.");
          }
          return obj.output.addReactionListener(LASTID, emoji);
        }
        api.setMessageReaction(emoji, mid, (err) => {}, true);
      },
      dispatch: output,
      get prepend() {
        return prepend;
      },
      set prepend(val) {
        prepend = val;
      },
      get append() {
        return append;
      },
      set append(val) {
        append = val;
      },
      replyStyled(body, style, thread) {
        return output(body, {
          threadID: thread,
          style: style || {},
          isReply: true,
        });
      },
      sendStyled(body, style, thread) {
        return output(body, {
          threadID: thread,
          style: style || {},
        });
      },

      async confirm(body, done, sstyle) {
        const text = `⚠️ ${body}\n${UNIRedux.standardLine}\n**Yes** | **No**`;
        const info = sstyle
          ? await this.replyStyled(text, sstyle)
          : await this.reply(text);

        return new Promise((resolve, reject) => {
          input.setReply(info.messageID, {
            author: input.senderID,

            /**
             *
             * @param {CommandContext} repCtx
             */
            callback(repCtx) {
              if (repCtx.input.senderID !== input.senderID) {
                return;
              }
              const newCtx = {
                ...repCtx,
                yes: repCtx.input.body.toLowerCase() === "yes",
                no: repCtx.input.body.toLowerCase() === "no",
              };
              if (!newCtx.yes && !newCtx.no) {
                return repCtx.output.reply(
                  `❌ Invalid response, please go back and reply either **yes** or **no**.`
                );
              }
              done?.(newCtx);
              resolve(newCtx);
              input.delReply(info.messageID);
            },
          });
        });
      },
    };
    outputProps.Styled = class {
      constructor(style) {
        this.style = style;
        this.lastID = null;
      }
      async reply(body) {
        const i = await outputProps.replyStyled(body, this.style);
        this.lastID = i.messageID;
        return i;
      }
      async send(body) {
        const i = await outputProps.sendStyled(body, this.style);
        this.lastID = i.messageID;

        return i;
      }
      async edit(body, messageID, delay) {
        return outputProps.edit(
          body,
          this.lastID ?? messageID,
          delay,
          this.style
        );
      }
    };
    outputProps.syntaxError = async function syntaxError(commandX) {
      let cmdName = null;
      if (obj.command || commandX) {
        const { metadata = {} } = obj.command || commandX;
        cmdName = metadata.name;
      }
      return await outputProps.reply(
        `❌ The command syntax you are using is invalid, please use ${
          cmdName ? `${obj.prefix}help ${cmdName}` : `the help command`
        } to see how it works.`
      );
    };
    //Only works to Fca of NicaBoT:
    outputProps.edit = async function edit(
      text,
      mid,
      delay,
      style = {},
      options = {}
    ) {
      //const refStyle = { ...(cmd && cmd.style ? cmd.style : {}), ...style };
      const { styler } = obj;
      const stylerShallow = styler.shallowMake({}, style);

      let result = prepend + "\n" + text + "\n" + append;
      result = result.trim();

      if (global.Cassidy.config.censorOutput && result) {
        result = obj.input.censor(result);
      }

      /*if (Object.keys(refStyle).length > 0) {
        result = await styled(result, refStyle);
      }*/
      result = await processOutput({ ...options, body: result });

      result = input.isWss
        ? stylerShallow.html(result)
        : stylerShallow.text(result);
      return new Promise((res) => {
        const aa = api.editMessage(result, mid, () => res(true));
        if (aa instanceof Promise) {
          aa.then(res);
        } else {
          res(false);
        }
      });
    };
    outputProps.frames = async function frames(...args) {
      let texts = [];
      let mss = [];
      args.forEach((item, index) => {
        if (index % 2 === 0) {
          texts.push(item);
        } else {
          mss.push(item);
        }
      });
      const output = outputProps;
      const i = await output.reply(texts[0]);
      texts.shift();
      for (const index in texts) {
        const text = texts[index];
        await delay(mss[index] || 1000);
        await output.edit(text, i.messageID);
      }
      return i;
    };

    //assignProp(output, outputProps);
    /* obj.outputNew = new Proxy(output, {
      get(_, prop) {
        if (prop in outputProps) {
          return outputProps[prop];
        } else {
          throw new Error(`The property output.${prop} does not exist.`);
        }
      },
      set(_, prop, value) {
        outputProps[prop] = value;
      }
    });*/
    outputProps.react = outputProps.reaction;

    // @ts-ignore
    obj.output = outputProps;
    obj.outputOld = output;
    obj.output.formatError = formatError;
    class AutoEdit {
      constructor(lim = 6) {
        this.editCount = 0;
        this.stack = "";
        this.messageID = null;
        this.lim = lim;
      }
      async do(message) {
        if (!this.messageID) {
          const { messageID } = await obj.output.reply(message);
          this.messageID = messageID;
          return this;
        }
        if (this.editCount < this.lim) {
          await obj.output.edit(message, this.messageID);
          this.editCount++;
          return this;
        } else {
          const newInstance = new AutoEdit();
          await newInstance.do(message);
          return newInstance;
        }
      }
      async addUp(message) {
        const i = await this.do(this.stack + message);
        this.stack += message;
        return i;
      }
    }
    obj.AutoEdit = AutoEdit;
  } catch (err) {
    console.log(err);
  }
  const cassIO = new CassidyIO(obj.input, obj.output, obj.command?.style);
  obj.cassIO = cassIO;
  obj.input.attachSystemsToOutput(obj.output);
  const easy = new EasyOutput(obj.output, obj.input);
  obj.print = easy.getBound("print");
  obj.reply = easy.getBound("reply");
  obj.send = easy.getBound("send");
  obj.attachment = easy.getBound("attachment");
  obj.reaction = easy.getBound("reaction");
  obj.edit = easy.getBound("edit");
  obj.unsend = easy.getBound("unsend");
  obj.atReply = easy.getBound("atReply");
  obj.atReaction = easy.getBound("atReaction");

  obj.EasyOutput = EasyOutput;

  obj.next();
}

export class EasyOutput {
  /**
   * @type {import("output-cassidy").OutputProps}
   */
  output;
  /**
   * @type {InputClass}
   */
  input;

  /**
   *
   * @type {OutputResult}
   */
  lastMessage;

  /**
   *
   * @param {import("output-cassidy").OutputProps} output
   * @param {InputClass} input
   */
  constructor(output, input) {
    this.output = output;
    this.input = input;
    this.lastMessage = null;
    /**
     *
     * @param {OutputResult} i
     */
    this.resumeMessageWaiter = (i) => {
      return i;
    };
  }

  /**
   * @template {keyof EasyOutput} K
   * @param {K} key
   * @returns {EasyOutput[K] extends (...args: any[]) => any ? (this: EasyOutput, ...params: Parameters<EasyOutput[K]>) => ReturnType<EasyOutput[K]> : EasyOutput[K]}
   */
  getBound(key) {
    if (typeof this[key] !== "function") {
      return this[key];
    }
    return this[key].bind(this);
  }

  get print() {
    return this.reply;
  }

  /**
   *
   * @param {string} msg
   */
  async reply(msg) {
    const i = await this.output.reply({
      body: String(msg),
    });
    this.setLastMessage(i);
    return i;
  }

  /**
   *
   * @param {string} msg
   */
  async send(msg) {
    const i = await this.output.send({
      body: String(msg),
    });
    this.setLastMessage(i);
    return i;
  }

  /**
   *
   * @param {string} url
   * @param {string?} msg
   */
  attachment(url, msg = "") {
    return this.output.attach(String(msg) || "", String(url));
  }

  /**
   *
   * @param {string} emoji
   */
  reaction(emoji) {
    return this.output.reaction(emoji);
  }

  /**
   *
   * @returns {OutputResult}
   */
  getMessageWaiter() {
    return new Promise((res) => {
      if (this.lastMessage) {
        return res(this.lastMessage);
      }
      this.resumeMessageWaiter = (i) => {
        res(i);
        return i;
      };
    });
  }

  /**
   *
   * @param {OutputResult} i
   */
  setLastMessage(i) {
    this.resumeMessageWaiter(i);
    this.lastMessage = i;
  }

  async unsend() {
    const last = await this.getMessageWaiter();
    if (!last) {
      this.throwLast();
    }

    return last.unsendSelf();
  }

  /**
   *
   * @param {string} msg
   * @param {number?} delay
   */
  async edit(msg, delay = 500) {
    const last = await this.getMessageWaiter();
    if (!last) {
      this.throwLast();
    }

    await global.utils.delay(delay);

    return last.editSelf(msg);
  }

  /**
   *
   * @param {(ctx: CommandContext) => any | Promise<any>} callback
   */
  async atReply(callback) {
    const last = await this.getMessageWaiter();
    if (!last) {
      this.throwLast();
    }

    return last.atReply(callback);
  }

  /**
   *
   * @param {(ctx: CommandContext) => any | Promise<any>} callback
   */
  async atReaction(callback) {
    const last = await this.getMessageWaiter();
    if (!last) {
      this.throwLast();
    }

    return last.atReaction(callback);
  }

  throwLast() {
    if (!this.lastMessage) {
      throw new Error("The bot haven't send a message yet!");
    }
  }
}

function assignProp(func, obj) {
  const wrapper = (...args) => {
    return func(...args);
  };

  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      wrapper[key] = obj[key];
    }
  }

  return wrapper;
}

function formatError(error) {
  let errorMessage = "❌ | An error has occurred:\n";

  if (error instanceof Error) {
    const { name, message, stack, ...rest } = error;

    if (stack) errorMessage += `${stack}\n`;

    for (const key in rest) {
      if (Object.prototype.hasOwnProperty.call(rest, key)) {
        errorMessage += `${key}: ${rest[key]}\n`;
      }
    }
  } else {
    errorMessage += inspect(error, { depth: null, showHidden: true });
  }

  return errorMessage;
}
