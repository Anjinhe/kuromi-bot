const { create, Client } = require('@open-wa/wa-automate')
const fs = require('fs-extra')
const kconfig = require('./config')
const options = require('./lib/options')
const { color, sleep } = require('./lib/functions')
const config = require('./lib/config/Bot/config.json')
const canvas = require('discord-canvas')
const { mylang } = require('./lib/lang')
const axios = require('axios')
const irisvs = require('./package.json')

// Cria um cliente de inicialização da BOT
const start = async (kill = new Client()) => {	
		// Forçar recarregamento caso obtenha erros
		kill.onStateChanged((state) => {
			console.log(color('[RELOAD]', 'red'), color('Isso pode ser ignorado →', 'lime'), color(state, 'yellow'))
			if (state === 'UNPAIRED' || state === 'CONFLICT' || state === 'UNLAUNCHED') kill.forceRefocus()
		})
		
        // Le as mensagens e limpa cache
        kill.onMessage((async (message) => {
            kill.getAmountOfLoadedMessages().then((msg) => { if (msg >= 1000) { kill.cutMsgCache() } })
            kconfig(kill, message)
        }))
		
		// Funções para caso seja adicionada em um grupo
        kill.onAddedToGroup(async (chat) => {
			const lmtgru = await kill.getAllGroups()
            const totalMem = chat.groupMetadata.participants.length
			if (chat.groupMetadata.participants.includes(config.owner)) {
				await kill.sendText(chat.id, mylang().novogrupo())
			} else if (totalMem < config.memberLimit) {
            	await kill.sendText(chat.id, mylang().noreq(totalMem))
				await kill.deleteChat(chat.id)
				await kill.leaveGroup(chat.id)
			} else if (lmtgru.length > config.gpLimit) {
				await kill.sendText(chat.id, mylang().cheio(lmtgru))
				await kill.deleteChat(chat.id)
				await kill.leaveGroup(chat.id)
            } else { kill.sendText(chat.id, mylang().novogrupo()) }
			console.log(color('[NOVO]', 'red'), color(`Fui adicionada ao grupo ${chat.contact.name} e eles tem ${totalMem} membros.`, 'yellow'))
        })
		
		// Configuração do welcome
		kill.onGlobalParticipantsChanged(async (event) => {
			const welkom = JSON.parse(fs.readFileSync('./lib/config/Grupos/welcome.json'))
			const bklist = JSON.parse(fs.readFileSync('./lib/config/Bot/anti.json'))
			const anti = JSON.parse(fs.readFileSync('./lib/config/Grupos/blacklist.json'))
			const fks = JSON.parse(fs.readFileSync('./lib/config/Grupos/fake.json'))
			const personr = event.who
			const numebot = await kill.getHostNumber() + '@c.us'
			const isMyBot = personr.includes(numebot)
			const ddi = config.ddi
			const isWelkom = welkom.includes(event.chat)
			const isFake = fks.includes(event.chat)
			const fake = personr.startsWith(ddi)
			const isAnti = anti.includes(event.chat)
			const fuck = bklist.includes(event.who)
			const eChat = await kill.getContact(event.who)
			let { pushname, verifiedName, formattedName } = eChat
			pushname = pushname || verifiedName || formattedName
			const gChat = await kill.getChatById(event.chat)
			const { contact, groupMetadata, name } = gChat
			try {
				if (event.action == 'add') {
					if (isAnti && fuck && !isMyBot) {
						await kill.sendText(event.chat, mylang().entrace())
						await sleep(2000)
						await kill.removeParticipant(event.chat, event.who)
						await kill.contactBlock(event.who) // Evita ser travado por putinhos
						console.log(color('[BLACKLIST]', 'red'), color(`${pushname} - (${event.who.replace('@c.us', '')}) foi banido do ${name} por ter sido colocado na blacklist...`, 'yellow'))
					} else if (isFake && !fake && !isMyBot) {
						await kill.sendTextWithMentions(event.chat, mylang().nofake(event))
						await sleep(4000)
						await kill.removeParticipant(event.chat, event.who)
						await kill.contactBlock(event.who) // Evita ser travado por putinhos
						console.log(color('[FAKE]', 'red'), color(`${pushname} - (${event.who.replace('@c.us', '')}) foi banido do ${name} por usar número falso ou ser de fora do país...`, 'yellow'))
					} else if (isWelkom && !isMyBot) {
						var profile = await kill.getProfilePicFromServer(event.who)
						if (profile == '' || profile == undefined) profile = 'https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTQcODjk7AcA4wb_9OLzoeAdpGwmkJqOYxEBA&usqp=CAU'
						const welcomer = await new canvas.Welcome()
						.setUsername(pushname)
						.setDiscriminator(event.who.substring(6, 10))
						.setMemberCount(groupMetadata.participants.length)
						.setGuildName(name)
						.setAvatar(profile)
						.setText("title", `BEM VINDO`)
						.setText("message", `VOCÊ ESTÁ NO {server}`)
						.setText("member-count", `VOCÊ É O MEMBRO N° {count}`)
						.setColor('border', '#00100C')
						.setColor('username-box', '#00100C')
						.setColor('discriminator-box', '#00100C')
						.setColor('message-box', '#00100C')
						.setColor('title', '#6577AF')
						.setOpacity("username-box", 0.6)
						.setOpacity("discriminator-box", 0.6)
						.setOpacity("message-box", 0.6)
						.setOpacity("border", 0.4)
						.setBackground('https://images.wallpaperscraft.com/image/landscape_art_road_127350_1280x720.jpg')
						.toAttachment()
						const base64 = `data:image/png;base64,${welcomer.toBuffer().toString('base64')}`
						await kill.sendFile(event.chat, base64, 'welcome.png', mylang().welcome(pushname, name))
						await kill.sendPtt(event.chat, `./lib/media/audio/welcome.mp3`)
						console.log(color('[ENTROU]', 'red'), color(`${pushname} - (${event.who.replace('@c.us', '')}) entrou no grupo ${name}...`, 'yellow'))
					}
				} else if (event.action == 'remove' && isWelkom && !isMyBot) {
					var profile = await kill.getProfilePicFromServer(event.who)
					if (profile == '' || profile == undefined) profile = 'https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcTQcODjk7AcA4wb_9OLzoeAdpGwmkJqOYxEBA&usqp=CAU'
					const bye = await new canvas.Goodbye()
					.setUsername(pushname)
					.setDiscriminator(event.who.substring(6, 10))
					.setMemberCount(groupMetadata.participants.length)
					.setGuildName(name)
					.setAvatar(profile)
					.setText("title", `ADEUS`)
					.setText("message", `SAIU DO {server}`)
					.setText("member-count", `ELE FOI O MEMBRO N° {count}`)
					.setColor('border', '#00100C')
					.setColor('username-box', '#00100C')
					.setColor('discriminator-box', '#00100C')
					.setColor('message-box', '#00100C')
					.setColor('title', '#6577AF')
					.setOpacity("username-box", 0.6)
					.setOpacity("discriminator-box", 0.6)
					.setOpacity("message-box", 0.6)
					.setOpacity("border", 0.4)
					.setBackground('https://images.wallpaperscraft.com/image/landscape_art_road_127350_1280x720.jpg')
					.toAttachment()
					const base64 = `data:image/png;base64,${bye.toBuffer().toString('base64')}`
					await kill.sendFile(event.chat, base64, 'welcome.png', mylang().bye(pushname))
					await kill.sendPtt(event.chat, `./lib/media/audio/bye.mp3`)
					console.log(color('[SAIU/BAN]', 'red'), color(`${pushname} - (${event.who.replace('@c.us', '')}) saiu ou foi banido do grupo ${name}...`, 'yellow'))
				}
			} catch (err) { console.log(err) }
        })

        // Bloqueia na call
        kill.onIncomingCall(async (callData) => {
            await kill.sendText(callData.peerJid, mylang().blockcalls())
            await kill.contactBlock(callData.peerJid)
			console.log(color('[CALL]', 'red'), color(`${callData.peerJid.replace('@c.us', '')} foi bloqueado por me ligar...`, 'yellow'))
        })
    }

// Cria uma sessão da Íris
create(options(start)).then((kill) => start(kill)).catch((err) => console.error(err))