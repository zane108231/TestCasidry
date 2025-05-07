// @ts-check
const moment = require("moment-timezone");

/**
 * @type {CassidySpectra.CommandMeta}
 */
export const meta = {
  name: "accept",
  otherNames: ["acp"],
  version: "1.0.0",
  author: "JV Barcenas | Liane Cagara",
  botAdmin: true,
  permissions: [2],
  description: "accept users",
  category: "Utilities",
  allowModerators: true,
  requirement: "3.0.0",
  noPrefix: false,
  icon: "💗",
  fbOnly: true,
  cmdType: "fb_utl",
};

/**
 * @type {CassidySpectra.CommandStyle}
 */
export const style = {
  title: "💗 Accept Users",
  titleFont: "bold",
  contentFont: "fancy",
};

/**
 *
 * @param {CommandContext  & { repObj: {messageID: string; listRequest: any; author: string; unsendTimeout: any }}} param0
 * @returns
 */
export async function onReply({ output: message, repObj: Reply, event, api }) {
  const { author, listRequest, messageID } = Reply;
  if (author !== event.senderID) return;
  const args = event.body.replace(/ +/g, " ").toLowerCase().split(" ");

  clearTimeout(Reply.unsendTimeout);
  const form = {
    av: api.getCurrentUserID(),
    fb_api_caller_class: "RelayModern",
    variables: {
      input: {
        source: "friends_tab",
        actor_id: api.getCurrentUserID(),
        client_mutation_id: Math.round(Math.random() * 19).toString(),
      },
      scale: 3,
      refresh_num: 0,
    },
  };

  const success = [];
  const failed = [];

  if (args[0] === "add") {
    form.fb_api_req_friendly_name =
      "FriendingCometFriendRequestConfirmMutation";
    form.doc_id = "3147613905362928";
  } else if (args[0] === "del") {
    form.fb_api_req_friendly_name = "FriendingCometFriendRequestDeleteMutation";
    form.doc_id = "4108254489275063";
  } else {
    return message.replyStyled(
      'Please select <add | del > <target number | or "all">',
      style
    );
  }

  let targetIDs = args.slice(1);

  if (args[1] === "all") {
    targetIDs = [];
    const lengthList = listRequest.length;
    for (let i = 1; i <= lengthList; i++) targetIDs.push(i);
  }

  const newTargetIDs = [];
  const promiseFriends = [];

  for (const stt of targetIDs) {
    const u = listRequest[parseInt(stt) - 1];
    if (!u) {
      failed.push(`Can't find stt ${stt} in the list`);
      continue;
    }
    form.variables.input.friend_requester_id = u.node.id;
    // @ts-ignore
    form.variables = JSON.stringify(form.variables);
    newTargetIDs.push(u);
    promiseFriends.push(
      api.httpPost("https://www.facebook.com/api/graphql/", form)
    );
    // @ts-ignore
    form.variables = JSON.parse(form.variables);
  }

  const lengthTarget = newTargetIDs.length;
  for (let i = 0; i < lengthTarget; i++) {
    try {
      const friendRequest = await promiseFriends[i];
      if (JSON.parse(friendRequest).errors) {
        failed.push(newTargetIDs[i].node.name);
      } else {
        success.push(newTargetIDs[i].node.name);
      }
    } catch (e) {
      failed.push(newTargetIDs[i].node.name);
    }
  }

  if (success.length > 0) {
    message.replyStyled(
      `» The ${
        args[0] === "add" ? "friend request" : "friend request deletion"
      } has been processed for ${success.length} people:\n\n${success.join(
        "\n"
      )}${
        failed.length > 0
          ? `\n» The following ${
              failed.length
            } people encountered errors: ${failed.join("\n")}`
          : ""
      }`,
      style
    );
  } else {
    api.unsendMessage(messageID);
    return message.replyStyled(
      "Invalid response. Please provide a valid response.",
      style
    );
  }

  api.unsendMessage(messageID);
}
/**
 *
 * @param {CommandContext } ctx
 */
export async function entry({ event, api, output, input }) {
  const form = {
    av: api.getCurrentUserID(),
    fb_api_req_friendly_name:
      "FriendingCometFriendRequestsRootQueryRelayPreloader",
    fb_api_caller_class: "RelayModern",
    doc_id: "4499164963466303",
    variables: JSON.stringify({ input: { scale: 3 } }),
  };
  const listRequest = JSON.parse(
    await api.httpPost("https://www.facebook.com/api/graphql/", form)
  ).data.viewer.friending_possibilities.edges;
  let msg = "";
  let i = 0;
  for (const user of listRequest) {
    i++;
    msg += `\n${i}. Name: ${user.node.name}
        + \nID: ${user.node.id}
        + \nUrl: ${user.node.url.replace("www.facebook", "fb")}
        + \nTime: ${moment(user.time * 1009)
          .tz("Asia/Manila")
          .format("DD/MM/YYYY HH:mm:ss")}\n`;
  }
  const info = await output.reply(
    `${msg}\nReply to this message with content: <add | del> <comparison | or "all"> to take action`
  );
  input.setReply(info.messageID, {
    messageID: info.messageID,
    listRequest,
    author: event.senderID,
    unsendTimeout: setTimeout(() => {
      api.unsendMessage(info.messageID);
    }, 60 * 1000),
    // @ts-ignore
    callback: onReply,
  });
}
