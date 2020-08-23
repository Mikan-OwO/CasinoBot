const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const discord = require('discord.js');
const client = new discord.Client();
const noobs = require('discord.js-noobs');
const nclient = noobs.Client;

const ms = require('ms');
const fs = require('fs');
const cron = require('node-cron');
const { inspect } = require('util');

const member = require('./member.json');
const owners = require('./owner.json');

const app = express();
const port = process.env.PORT;

const corsOptions = {
	origin: '*',
	optionsSuccessStatus: 200
};

app.use(bodyParser.text({ type: 'text/*' }));
app.use(express.static('public', { extensions: ['html'] }));
app.use(cors(corsOptions));

app.post('/test', async (req, res) => {
	const id = req.body;
	const user = member.find(m => m.uid === id);
	res.append('content-type', 'application/json');

	if (user) {
		const coins = user.coin;
		res.send({ result: String(coins) });
	} else {
		res.send({ error: 'IDが間違っています' });
	}
});

const commands = [
	{ name: 'help', value: 'このボットのhelpを表示します。' },
	{ name: 'login', value: 'ログインすることができます(？)' },
	{ name: 'status', value: '現在のステータスを表示します。(stで省略可能)' },
	{ name: 'give', value: '他人にアイテムを渡すことができます。' },
	{
		name: 'slot1 / slot2',
		value: 'スロットを回すことができます。引数にはcoinのBET数を入れてください。'
	}
];

const prefix = '\\';

client.on('ready', () => {
	console.log('起動完了です。');
	setInterval(() => {
		member.forEach(m => {
			m.coin += 1;
		});
	}, 60000);
});

client.on('message', async message => {
	if (!message.content.startsWith(prefix)) return;
	const [command, ...args] = message.content.slice(prefix.length).split(' ');
	const search = member.find(m => m.uid === message.author.id);
	const user = member.find(m => m.uid === String(args[0]));
	switch (command) {
    
		case 'eval':
			if (owners.includes(message.author.id)) {
				let evaled;
				try {
					evaled = await eval(args.join(' '));
					message.channel.send(inspect(evaled), { split: true });
				} catch (error) {
					message.reply('Error: ' + error);
				}
			} else {
				message.reply('ないよっ権(限)ないよぉ〜⤴︎');
			}
			break;
        
		/*case 'charge':
			if (owners.includes(message.author.id)) {
				user.coin += Number(args[1]);
				message.channel.send('ok');
			} else {
				message.reply('ないよっ権(限)ないよぉ〜⤴︎');
			}
			break;*/

		case 'help':
			message.channel.send(
				new discord.MessageEmbed()
					.setTitle(client.user.username + ' | Help  Board')
					.addFields(commands)
			);
			break;

		case 'ping':
			message.channel.send(client.ws.ping + 'ms');
			break;

		case 'login':
			if (Math.floor((Date.now() - message.author.createdAt) / 86400000) < 7)
				return message.reply(
					'大人しくあと' +
						(7 -
							Math.floor((Date.now() - message.author.createdAt) / 86400000)) +
						'日間待とうね^^'
				);
			if (!search) {
				member.push({
					uid: message.author.id,
					coin: 10000,
					inventory: []
				});
				fs.writeFile('./member.json', JSON.stringify(member), function(err) {
					if (err) {
						message.reply('Error: ' + err);
					} else {
						message.channel.send(
							new discord.MessageEmbed()
								.setTitle('登録が完了しました！')
								.setThumbnail(
									message.author.avatarURL({ format: 'png', size: 4096 })
								)
								.addField('所持コイン', '10000')
						);
					}
				});
			} else {
				message.reply('既に登録されています。');
			}
			break;

		case 'status':
		case 'st':
			if (!user) {
				if (!search) return message.reply('ログインしてください！');
				message.channel.send(
					new discord.MessageEmbed()
						.setTitle(message.author.username + 'さんのステータス')
						.addField('coin', search.coin)
				);
			} else {
				message.channel.send(
					new discord.MessageEmbed()
						.setTitle(
							client.users.cache.get(user.uid).username + 'さんのステータス'
						)
						.addField('coin', user.coin)
				);
			}
			break;

		case 'give':
			if (!search) return message.reply('ログインしてください！');
			if (user) {
				if (args[1]) {
					switch (args[1]) {
						case 'coin':
							if (args[0] === message.author.id)
								return message.reply('そうやって負荷かけてっとしばくぞ');
							if (search.coin >= Number(args[2]) && Number(args[2]) >= 1) {
								search.coin -= Number(args[2]);
								user.coin += Number(args[2]);
								message.channel.send(
									client.users.cache.get(user.uid).username +
										'にcoinを' +
										args[2] +
										'枚渡しました。'
								);
							} else {
								message.reply('あなたはそんなにcoinを所持していません。');
							}
							break;
						default:
							message.reply('そのようなアイテムは存在しましぇん！');
							break;
					}
				} else {
					message.reply('giveするアイテムを指定してください！');
				}
			} else {
				message.reply(
					'そのIDのユーザーは存在しません。\nもしくはそのプレイヤーはメンバーではありません。'
				);
			}
			break;

		case 'slot1':
			if (!search) return message.reply('ログインしてください！');
			const prob = Math.floor(Math.random() * 100);
			if (Number(args[0]) && Number(args[0]) >= 1) {
				if (search.coin >= Number(args[0])) {
					if (prob <= 25) {
						search.coin += Number(args[0]) * 4;
						message.channel.send(
							'当たりです！\n' + Number(args[0]) * 4 + 'coinを取得しました！'
						);
					} else {
						message.channel.send('はずれです...');
						search.coin -= Number(args[0]);
					}
					fs.writeFile('./member.json', JSON.stringify(member), function(err) {
						if (err) console.log(err);
					});
				} else {
					message.reply('あなたはそんなにcoinを所持していません。');
				}
			} else {
				message.reply('BETするコインの枚数を指定してください！');
			}
			break;

		case 'slot2':
			if (!search) return message.reply('ログインしてください！');
			if (Number(args[0]) && Number(args[0]) >= 1) {
				if (search.coin >= Number(args[0])) {
					const results = [];
					const item = ['🎃', '👑', '🎁', '🍫'];
					for (let c = 0; c < 9; c++) {
						results.push(item[Math.floor(Math.random() * item.length)]);
					}

					if (
						(results[0] === results[1] && results[1] === results[2]) ||
						(results[3] === results[4] && results[4] === results[5]) ||
						(results[6] === results[7] && results[7] === results[8])
					) {
						search.coin += Number(args[0]) * 6;
						message.channel.send(
							`${results[0]} | ${results[1]} | ${results[2]}\n${results[3]} | ${
								results[4]
							} | ${results[5]}\n${results[6]} | ${results[7]} | ${
								results[8]
							}` +
								'\n当たりです！\n' +
								Number(args[0]) * 6 +
								'coinを取得しました！'
						);
					} else {
						message.channel.send(
							`${results[0]} | ${results[1]} | ${results[2]}\n${results[3]} | ${
								results[4]
							} | ${results[5]}\n${results[6]} | ${results[7]} | ${
								results[8]
							}` + '\nはずれです...'
						);
						search.coin -= Number(args[0]);
					}
					fs.writeFile('./member.json', JSON.stringify(member), function(err) {
						if (err) console.log(err);
					});
				} else {
					message.reply('あなたはそんなにcoinを所持していません。');
				}
			} else {
				message.reply('BETするコインの枚数を指定してください！');
			}
			break;

		default:
			message.reply('どうやらコマンドが違うようです。');
			break;
	}
});

nclient.message('ping', 'pong!');

nclient.login(process.env.DISCORD_BOT_TOKEN);
client.login(process.env.DISCORD_BOT_TOKEN);
