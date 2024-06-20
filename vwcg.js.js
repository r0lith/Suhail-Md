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
        this.turnTimeLimit = 40; // Default turn time limit
        this.turnStartTime = 0;
        this.currentRemTime = 0;
        this.turnIntervalId = null;
        this.joiningPhaseSeconds = 60;
        this.maxJoiningPhaseSeconds = 180;
        this.minPlayers = 2;
        this.maxPlayers = 50;
        this.limitChangeTurns = 5;
        this.turnsPlayed = 0;
    }

    stopTurn() {
        clearInterval(this.turnIntervalId);
    }

    async AwaitForSeconds(seconds) {
        await new Promise(resolve => setTimeout(resolve, seconds * 1000));
        this.botPlayer = false;
    }

    async startTurn(message) {
        this.turnStartTime = Date.now();
        this.turnIntervalId = setInterval(() => {
            const elapsedSeconds = Math.floor((Date.now() - this.turnStartTime) / 1000);
            this.currentRemTime = this.turnTimeLimit - elapsedSeconds;
            if (this.currentRemTime <= 0 && this.gameStatus) {
                this.handleTimeUp(message);
            } else if (this.currentRemTime === 10) {
                this.sendReminder(message);
            }
        }, 1000);
    }

    handleTimeUp(message) {
        try {
            this.botPlayer = true;
            if (this.wordsCount !== 0 && this.player2 && this.player1) {
                message.send("Damn, Time's up!\n @" + this.currentPlayer.split("@")[0] + " Lost Game...!", {
                    mentions: [this.currentPlayer]
                });
                this.currentPlayer = this.currentPlayer === this.player1 ? this.player2 : this.player1;
                let gameInfo = "@" + this.currentPlayer.split("@")[0] + " Won The Game.\nWrong Attempt By Player : " + this.wrongAttempts[this.currentPlayer] + "\n\n\t\tGame Information\n\nTotal Chain Words : " + this.wordsCount + " \n" + this.longestWordBy + "\nChain Started From :- " + this.wordChain + " ...! \n";
                message.send(gameInfo, {
                    mentions: [this.currentPlayer]
                });
            } else if (this.wordsCount === 0 && this.player2 && this.player1) {
                message.bot.sendMessage(message.from, {
                    text: "Wcg Session Terminated, \nPLayer1 @" + this.player1.split("@")[0] + " And Player2 @" + this.player2.split("@")[0] + " both didn't take any move yet*",
                    mentions: [this.player1, this.player2]
                });
            } else if (!this.player2 || !this.player1) {
                message.bot.sendMessage(message.chat, {
                    text: "Word Chain Game Session Expired,\nReason : One Player Still Missing"
                });
            }
            this.stopTurn();
            delete astro_patch_wcg[message.chat];
        } catch (error) {
            return message.reply("Error while ending game: " + error);
        }
    }

    sendReminder(message) {
        this.botPlayer = true;
        if (this.player2 && this.player1) {
            let reminderText = "Reminder: Game Terminates After " + this.currentRemTime + "s\n\nWaiting For @" + this.currentPlayer.split("@")[0] + "'s Response\n_Take Your Turn, Otherwise Game Terminates\n_Make Sure Your Word Must Start With " + this.previousWord.slice(-1) + " , and Must Have Atleast " + this.wordLength + " letters\n\nYou Still Have " + this.currentRemTime + "Secs to Answer\nGive Your Best To Make It Difficult For Opponent";
            message.send(reminderText, {
                mentions: [this.currentPlayer]
            }, "asta");
        } else if (!this.player2 || !this.player1) {
            message.bot.sendMessage(message.jid, {
                text: "Still Waiting For Player to Start Word Chain Game...\n Type " + prefix + "wcg to Join The Game \nOtherwise : Wcg Session Expires After " + this.currentRemTime + "s"
            });
        }
        this.AwaitForSeconds(1);
    }

    updateLimits() {
        this.turnsPlayed++;
        if (this.turnsPlayed % this.limitChangeTurns === 0) {
            this.turnTimeLimit = Math.max(20, this.turnTimeLimit - 5);
            this.wordLength = Math.min(10, this.wordLength + 1);
            this.maxPlayers = Math.min(300, this.maxPlayers + 50);
        }
    }
}

class EliminationMode extends WordChainGame {
    constructor() {
        super();
        this.joiningPhaseSeconds = 90;
        this.minPlayers = 5;
        this.maxPlayers = 30;
        this.turnTimeLimit = 30;
        this.maxTurnScore = 20;
    }

    updateLimits() {
        this.turnsPlayed++;
        if (this.turnsPlayed % this.limitChangeTurns === 0) {
            this.turnTimeLimit = Math.max(20, this.turnTimeLimit - 5);
            this.wordLength = Math.min(10, this.wordLength + 1);
            this.maxPlayers = Math.min(50, this.maxPlayers + 20);
        }
    }
}

smd({
    pattern: "wcg",
    desc: "starts a Word Chain game.",
    filename: __filename,
    category: "game"
}, async (message, match) => {
    const chatId = message.chat;
    let gameInstance = astro_patch_wcg[chatId];
    if (match.startsWith("end") && gameInstance) {
        gameInstance.stopTurn();
        delete astro_patch_wcg[chatId];
        return await message.reply("Game ended. Goodbye!");
    }
    if (gameInstance && gameInstance.gameStatus) {
        return await message.reply("A game is already in progress in this chat.\nType .wcg end to terminate the session.");
    }
    let secondPlayer = message.quoted ? message.quoted.sender : message.mentionedJid ? message.mentionedJid[0] : false;
    if (!gameInstance) {
        gameInstance = new WordChainGame();
        astro_patch_wcg[chatId] = gameInstance;
    }
    if (!gameInstance.player1 || message.sender === gameInstance.player1) {
        if (secondPlayer && secondPlayer !== message.sender) {
            gameInstance.player1 = message.sender;
            gameInstance.player2 = secondPlayer;
            gameInstance.gameStatus = true;
        } else {
            gameInstance.player1 = message.sender;
            gameInstance.turnStartTime = Date.now();
            gameInstance.startTurn(message);
            return await message.bot.sendMessage(message.from, {
                text: "Game Starting...\nPLayer 1 : @" + gameInstance.player1.split("@")[0] + " Joined \n\n_Needs Another Player To Start Game...\nType *" + prefix + "wcg* to Join This Game.",
                mentions: [gameInstance.player1]
            });
        }
    } else if (message.sender !== gameInstance.player1) {
        gameInstance.player2 = message.sender;
        gameInstance.gameStatus = true;
    }
    if (gameInstance.gameStatus) {
        gameInstance.stopTurn();
        gameInstance.botPlayer = true;
        gameInstance.turnStartTime = Date.now();
        gameInstance.startTurn(message);
        gameInstance.wrongAttempts[gameInstance.player1] = 0;
        gameInstance.wrongAttempts[gameInstance.player2] = 0;
        gameInstance.previousWord = String.fromCharCode("a".charCodeAt(0) + Math.floor(Math.random() * 26));
        gameInstance.wordChain = gameInstance.previousWord;
        gameInstance.currentPlayer = gameInstance.player1;
        gameInstance.AwaitForSeconds(3);
        return await message.bot.sendMessage(message.chat, {
            text: "Game started Now...\n _Turn : @" + gameInstance.player1.split("@")[0] + "\n _Next @" + gameInstance.player2.split("@")[0] + "\n Let's play! : @" + gameInstance.currentPlayer.split("@")[0] + "'s Word Must Start With *" + gameInstance.previousWord + "*.\n_you Have " + gameInstance.turnTimeLimit + "Secs to Answer\n",
            mentions: [gameInstance.player1, gameInstance.player2, gameInstance.currentPlayer]
        });
    }
});

smd({
    cmdname: "delwcg",
    info: "deletes word chain game running session.",
    filename: __filename,
    type: "game"
}, async ({ chat, isCreator, send, reply, sender, isAdmin }) => {
    let gameInstance = astro_patch_wcg[chat];
    if (gameInstance) {
        if (!isCreator && sender !== gameInstance.player2 && sender !== gameInstance.player1 && !isAdmin) {
            await send("┏━━━━━━━━━━━━━━━━━━┓\n┃ WORD CHAIN GAME ┃\n┗━━━━━━━━━━━━━━━━━━┛\n\nUhh Please, You are not a Player of running game!!!\n");
        } else {
            gameInstance.stopTurn();
            await reply(("┏━━━━━━━━━━━━━━━━━━┓\n┃ WORD CHAIN GAME ┃\n┗━━━━━━━━━━━━━━━━━━┛\n\nRoom Id : _wcg-" + chat.split("@")[0] + " Cleared Successfully*\nWord Chain Game Session Deleted From This Chat...\n\n\n\n" + (gameInstance.wordsCount > 0 ? "\tGame Information\n\nTotal Chain Words : " + gameInstance.wordsCount + " \n" + gameInstance.longestWordBy + "\nChain Started From :- " + gameInstance.wordChain + " ...!" : "") + "\n\n").trim());
            console.log("counts : ", gameInstance.wordsCount);
            delete astro_patch_wcg[chat];
        }
    } else {
        await reply("┏━━━━━━━━━━━━━━━━━━┓\n┃ WORD CHAIN 404Error ┃\n┗━━━━━━━━━━━━━━━━━━┛ \n\nUhh Dear, There's No Game Started yet in This Chat\n");
    }
});

smd({
    on: "text"
}, async (message, match, { isCreator }) => {
    if (message.isBot) {
        return;
    }
    const chatId = message.chat;
    const gameInstance = astro_patch_wcg[chatId];
    if (!gameInstance) {
        return;
    }
    const sender = message.user;
    if (gameInstance.gameStatus && gameInstance.currentPlayer === message.sender && message.text && !gameInstance.botPlayer) {
        const word = match.split(" ")[0].trim().toLowerCase();
        if (word.length >= gameInstance.wordLength && word.charAt(0) === gameInstance.previousWord.slice(-1)) {
            if (word.length > gameInstance.wordLength) {
                gameInstance.longestWordBy = "Longest Word With " + word.length + " letters is " + word + " by @" + gameInstance.currentPlayer.split("@")[0];
            }
            gameInstance.wordsCount++;
            gameInstance.botPlayer = true;
            gameInstance.stopTurn();
            gameInstance.turnStartTime = Date.now();
            gameInstance.startTurn(message);
            gameInstance.previousWord = word;
            gameInstance.wordChain += "\t⇢" + gameInstance.previousWord;
            gameInstance.updateLimits();
            await message.bot.sendMessage(message.chat, {
                react: {
                    text: "✅",
                    key: message.key
                }
            });
            gameInstance.currentPlayer = gameInstance.currentPlayer === gameInstance.player1 ? gameInstance.player2 : gameInstance.player1;
            let turnInfo = "\nWord Accepted...? ✅\n_Current Turn : @" + gameInstance.currentPlayer.split("@")[0] + "\n_Next Turn : @" + (gameInstance.currentPlayer === gameInstance.player1 ? gameInstance.player2 : gameInstance.player1).split("@")[0] + "\n\n_Your word must start with '" + gameInstance.previousWord.slice(-1).toUpperCase() + "' , and must have at least '" + gameInstance.wordLength + "' letters\n_you have " + gameInstance.turnTimeLimit + "Secs to answer\n_Total words yet : " + gameInstance.wordsCount + "\n\n ";
            if (sender === gameInstance.currentPlayer) {
                gameInstance.AwaitForSeconds(3);
            } else {
                gameInstance.botPlayer = false;
            }
            return await message.bot.sendMessage(message.from, {
                text: turnInfo,
                mentions: [gameInstance.player1, gameInstance.player2]
            });
        } else if (!gameInstance.botPlayer) {
            gameInstance.botPlayer = true;
            await message.bot.sendMessage(message.chat, {
                react: {
                    text: "❎",
                    key: message.key
                }
            });
            if (!gameInstance.wrongAttempts[gameInstance.currentPlayer]) {
                gameInstance.wrongAttempts[gameInstance.currentPlayer] = 1;
            } else {
                gameInstance.wrongAttempts[gameInstance.currentPlayer]++;
            }
            if (gameInstance.wrongAttempts[gameInstance.currentPlayer] >= gameInstance.maxAttempts) {
                gameInstance.stopTurn();
                delete astro_patch_wcg[chatId];
                let wordChainArray = gameInstance.wordChain.split(",");
                return await message.reply("Wrong Attempt Exceeds! : " + gameInstance.wrongAttempts[gameInstance.currentPlayer] + "\n Game Terminated, " + gameInstance.currentPlayer.split("@")[0] + " Can't Find a Word That should start with \"" + gameInstance.previousWord.slice(-1) + "\".\n\n\nTotal Chain Words : " + wordChainArray.length + "\n Started From : " + wordChainArray.join("\t⇢") + " \n\nGame ended.");
            }
            let invalidReason = word.charAt(0) === gameInstance.previousWord.slice(-1) ? word.length > gameInstance.wordLength ? "_Word Length is Smaller Than " + gameInstance.wordLength + " letters" : "Invalid Word" : "Given Word Not Start With '" + gameInstance.previousWord.slice(-1) + "'";
            let errorMessage = "Word Not Accepted...? ❎\nReason : _" + invalidReason + "\n\n_Current Turn : @" + gameInstance.currentPlayer.split("@")[0] + "\n_Next Turn : @" + (gameInstance.currentPlayer === gameInstance.player1 ? gameInstance.player2 : gameInstance.player1).split("@")[0] + "\n\n_Your Word Must Start With " + gameInstance.previousWord.slice(-1) + " , and Must Have At Least 4 letters\n_Try Again, you Still Have " + gameInstance.currentRemTime + "Secs to Answer\n";
            await message.sendMessage(message.chat, {
                text: errorMessage,
                mentions: [gameInstance.player1, gameInstance.player2]
            });
            if (gameInstance.currentPlayer === sender) {
                return await gameInstance.AwaitForSeconds(3);
            } else {
                gameInstance.botPlayer = false;
            }
        }
    }
});
