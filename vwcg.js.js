const games = {};
const astro_patch_wcg = {};
const numbersArray = [40, 45, 50];

class WordChainGame {
  constructor() {
    this.player1 = "";
    this.player2 = "";
    this.currentPlayer = "";
    this.previousWord = "";
    this.wordChain = "";
    this.wordsCount = 0;
    this.wordLength = 4;
    this.longestWordBy = "There's No Word yet";
    this.gameStatus = false;
    this.botPlayer = false;
    this.wrongAttempts = {};
    this.maxAttempts = 5;
    this.turnTimeLimit = 45;
    this.turnStartTime = 45;
    this.currentRemTime = 45;
    this.turnIntervalId = null;
    this.maxPlayers = 50; // Default max players
  }

  stopTurn() {
    clearInterval(this.turnIntervalId);
  }

  async AwaitForSeconds(seconds) {
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    this.botPlayer = false;
  }

  async startTurn(chatContext) {
    this.turnIntervalId = setInterval(() => {
      const elapsedTime = Math.floor((Date.now() - this.turnStartTime) / 1000);
      this.currentRemTime = this.turnTimeLimit - elapsedTime;
      if (this.currentRemTime === 0 && this.gameStatus) {
        try {
          this.botPlayer = true;
          if (this.wordsCount !== 0 && this.player2 && this.player1) {
            chatContext.send("Damn, Time's up!\n @" + this.currentPlayer.split("@")[0] + " Lost Game...!", {
              mentions: [this.currentPlayer]
            });
            this.currentPlayer = this.currentPlayer === this.player1 ? this.player2 : this.player1;
            let gameInfo = "@" + this.currentPlayer.split("@")[0] + " Won The Game.\nWrong Attempt By Player: " + this.wrongAttempts[this.currentPlayer] + "\n\n\t\tGame Information\n\nTotal Chain Words: " + this.wordsCount + " \n" + this.longestWordBy + "\nChain Started From: " + this.wordChain + " ...! \n";
            chatContext.send(gameInfo, {
              mentions: [this.currentPlayer]
            });
          } else if (this.wordsCount === 0 && this.player2 && this.player1) {
            chatContext.bot.sendMessage(chatContext.from, {
              text: "Wcg Session Terminated, \nPlayer1 @" + this.player1.split("@")[0] + " And Player2 @" + this.player2.split("@")[0] + " both didn't take any move yet*",
              mentions: [this.player1, this.player2]
            });
          } else if (!this.player2 || !this.player1) {
            chatContext.bot.sendMessage(chatContext.chat, {
              text: "Word Chain Game Session Expired,\nReason: One Player Still Missing"
            });
          }
          this.stopTurn();
          delete astro_patch_wcg[chatContext.chat];
        } catch (error) {
          return chatContext.reply("Error while ending game: " + error);
        }
      } else if (this.currentRemTime === 10) {
        this.botPlayer = true;
        if (this.player2 && this.player1) {
          let reminder = "Reminder: Game Terminates After " + this.currentRemTime + "s\n\nWaiting For @" + this.currentPlayer.split("@")[0] + "'s Response \n_Take Your Turn, Otherwise Game Terminates\n_Make Sure Your Word Must Start With " + this.previousWord.slice(-1) + " , and Must Have At Least " + this.wordLength + " letters\n\nYou Still Have " + this.currentRemTime + "Secs to Answer\nGive Your Best To Make It Difficult For Opponent";
          chatContext.send(reminder, {
            mentions: [this.currentPlayer]
          }, "asta");
        } else if (!this.player2 || !this.player1) {
          chatContext.bot.sendMessage(chatContext.jid, {
            text: "Still Waiting For Player to Start Word Chain Game...\nType " + prefix + "wcg to Join The Game \nOtherwise: Wcg Session Expires After " + this.currentRemTime + "s"
          });
        }
        this.AwaitForSeconds(1);
      }
    }, 1000);
  }
}

smd({
  pattern: "wcg",
  desc: "starts a Word Chain game.",
  filename: __filename,
  category: "game"
}, async (msg, args) => {
  const chat = msg.chat;
  let game = astro_patch_wcg[chat];
  if (args.startsWith("end") && game) {
    game.stopTurn();
    delete astro_patch_wcg[chat];
    return await msg.reply("Game ended. Goodbye!");
  }
  if (game && game.gameStatus) {
    return await msg.reply("A game is already in progress in this chat.\nType .wcg end to Terminate the Session");
  }
  let player2 = msg.quoted ? msg.quoted.sender : msg.mentionedJid ? msg.mentionedJid[0] : false;
  if (!game) {
    game = new WordChainGame();
    astro_patch_wcg[chat] = game;
  }
  if (!game.player1 || msg.sender === game.player1) {
    if (player2 && player2 !== msg.sender) {
      game.player1 = msg.sender;
      game.player2 = player2;
      game.gameStatus = true;
    } else {
      game.player1 = msg.sender;
      game.turnStartTime = Date.now();
      game.startTurn(msg);
      return await msg.bot.sendMessage(msg.from, {
        text: "Game Starting...\nPlayer 1: @" + game.player1.split("@")[0] + " Joined \n\n_Needs Another Player To Start Game...\nType " + prefix + "wcg to Join This Game.",
        mentions: [game.player1]
      });
    }
  } else if (msg.sender !== game.player1) {
    game.player2 = msg.sender;
    game.gameStatus = true;
  }
  if (game.gameStatus) {
    game.stopTurn();
    game.botPlayer = true;
    game.turnStartTime = Date.now();
    game.startTurn(msg);
    game.wrongAttempts[game.player1] = 0;
    game.wrongAttempts[game.player2] = 0;
    game.previousWord = String.fromCharCode("a".charCodeAt(0) + Math.floor(Math.random() * 26));
    game.wordChain = game.previousWord;
    game.currentPlayer = game.player1;
    game.AwaitForSeconds(3);
    return await msg.bot.sendMessage(msg.chat, {
      text: "Game started Now...\n _Turn: @" + game.player1.split("@")[0] + "\n _Next: @" + game.player2.split("@")[0] + "\n Let's play! : @" + game.currentPlayer.split("@")[0] + "'s Word Must Start With \"" + game.previousWord + "\" .\n_You Have " + game.turnTimeLimit + "Secs to Answer\n",
      mentions: [game.player1, game.player2, game.currentPlayer]
    });
  }
});

smd({
  cmdname: "delwcg",
  info: "deletes word chain game running session.",
  filename: __filename,
  type: "game"
}, async ({
  chat,
  isCreator,
  send,
  reply,
  sender,
  isAdmin
}) => {
  let game = astro_patch_wcg[chat];
  if (game) {
    if (!isCreator && sender !== game.player2 && sender !== game.player1 && !isAdmin) {
      await send("┏━━━━━━━━━━━━━━━━━━┓\n┃ WORD CHAIN GAME ┃\n┗━━━━━━━━━━━━━━━━━━┛\n\nUhh Please, You are not a Player of running game!!!\n");
    } else {
      game.stopTurn();
      await reply(("┏━━━━━━━━━━━━━━━━━━┓\n┃ WORD CHAIN GAME ┃\n┗━━━━━━━━━━━━━━━━━━┛\n\nRoom Id: _wcg-" + chat.split("@")[0] + " Cleared Successfully*\nWord Chain Game Session Deleted From This Chat...\n\n\n\n" + (game.wordsCount > 0 ? "\tGame Information\n\nTotal Chain Words: " + game.wordsCount + " \n" + game.longestWordBy + "\nChain Started From: " + game.wordChain + " ...!" : "") + "\n\n").trim());
      console.log("counts:", game.wordsCount);
      delete astro_patch_wcg[chat];
    }
  } else {
    reply("┏━━━━━━━━━━━━━━━━━━┓\n┃ WORD CHAIN 404Error ┃\n┗━━━━━━━━━━━━━━━━━━┛ \n\nUhh Dear, There's No Game Started yet in This Chat\n");
  }
});

smd({
  on: "text"
}, async (msg, text, {
  isCreator
}) => {
  if (msg.isBot) {
    return;
  }
  const chat = msg.chat;
  const game = astro_patch_wcg[chat];
  if (!game) {
    return;
  }
  const user = msg.user;
  if (game.gameStatus && game.currentPlayer === msg.sender && msg.text && !game.botPlayer) {
    const word = text.split(" ")[0].trim().toLowerCase();
    if (word.length >= game.wordLength && word.charAt(0) === game.previousWord.slice(-1)) {
      if (word.length > game.wordLength) {
        game.longestWordBy = "Longest Word With " + word.length + " letters is " + word + " by @" + game.currentPlayer.split("@")[0];
      }
      game.wordsCount++;
      game.botPlayer = true;
      game.stopTurn();
      game.turnStartTime = Date.now();
      game.startTurn(msg);
      game.previousWord = word;
      game.wordChain += "\t⇢" + game.previousWord;
      game.turnTimeLimit = Math.floor(Math.random() * 10) + 35;
      await msg.bot.sendMessage(msg.chat, {
        react: {
          text: "✅",
          key: msg.key
        }
      });
      game.currentPlayer = game.currentPlayer === game.player1 ? game.player2 : game.player1;
      let response = "\nWord Accepted...? ✅\n_Current Turn: @" + game.currentPlayer.split("@")[0] + "\n_Next Turn: @" + (game.currentPlayer === game.player1 ? game.player2 : game.player1).split("@")[0] + "\n\n_Your word must start with '" + game.previousWord.slice(-1).toUpperCase() + "' , and must have at least '" + game.wordLength + "' letters\n_you have " + game.turnTimeLimit + "Secs to answer\n_Total words yet: " + game.wordsCount + "\n\n ";
      if (user === game.currentPlayer) {
        game.AwaitForSeconds(3);
      } else {
        game.botPlayer = false;
      }
      return await msg.bot.sendMessage(msg.from, {
        text: response,
        mentions: [game.player1, game.player2]
      });
    } else if (!game.botPlayer) {
      game.botPlayer = true;
      await msg.bot.sendMessage(msg.chat, {
        react: {
          text: "❎",
          key: msg.key
        }
      });
      if (!game.wrongAttempts[game.currentPlayer]) {
        game.wrongAttempts[game.currentPlayer] = 1;
      } else {
        game.wrongAttempts[game.currentPlayer]++;
      }
      if (game.wrongAttempts[game.currentPlayer] >= game.maxAttempts) {
        game.stopTurn();
        delete astro_patch_wcg[chat];
        let chainWords = game.wordChain.split(",");
        return await msg.reply("Wrong Attempt Exceeds! : " + game.wrongAttempts[game.currentPlayer] + "\n Game Terminated, " + game.currentPlayer.split("@")[0] + " Can't Find a Word That should start with \"" + game.previousWord.slice(-1) + "\".\n\n\nTotal Chain Words: " + chainWords.length + "\n Started From: " + chainWords.join("\t⇢") + " \n\nGame ended.");
      }
      let errorReason = word.charAt(0) === game.previousWord.slice(-1) ? word.length > game.wordLength ? "_Word Length is Smaller Than " + game.wordLength + " letters" : "Invalid Word" : "Given Word Not Start With '" + game.previousWord.slice(-1) + "'";
      let errorMsg = "Word Not Accepted...? ❎\nReason: _" + errorReason + "\n\n_Current Turn: @" + game.currentPlayer.split("@")[0] + "\n_Next Turn: @" + (game.currentPlayer === game.player1 ? game.player2 : game.player1).split("@")[0] + "\n\n_Your Word Must Start With " + game.previousWord.slice(-1) + " , and Must Have At Least 4 letters\n_Try Again, you Still Have " + game.currentRemTime + "Secs to Answer\n";
      await msg.sendMessage(msg.chat, {
        text: errorMsg,
        mentions: [game.player1, game.player2]
      });
      if (game.currentPlayer === user) {
        return await game.AwaitForSeconds(3);
      } else {
        game.botPlayer = false;
      }
    }
  }
});

// Adding condition to increase the maxPlayers to 300 if certain conditions are met
smd({
  pattern: "increaseMaxPlayers",
  desc: "Increases the maximum number of players to 300 under certain conditions.",
  filename: __filename,
  category: "game"
}, async (msg, args) => {
  const chat = msg.chat;
  let game = astro_patch_wcg[chat];
  if (!game) {
    return await msg.reply("No game session found.");
  }
  // Example condition: Admin command or premium user
  const isAdmin = true; // Replace with actual condition check
  if (isAdmin) {
    game.maxPlayers = 300;
    await msg.reply("Maximum number of players has been increased to 300.");
  } else {
    await msg.reply("You do not have permission to increase the maximum number of players.");
  }
});
