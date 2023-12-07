const { nowInSec, uuidV4, SkyWayAuthToken, SkyWayContext, SkyWayStreamFactory, SkyWayRoom } = skyway_room;

const postData = { message: 'Data from client to server' };
console.log(postData);
const fetchParam = {
	method : 'POST',
	headers: {
    'Content-Type': 'application/json',
  }
}
const getToken_url = "/meeting/getData";

let kimono = 0;

fetchParam.body = JSON.stringify(postData);

fetch(getData_url, fetchParam)
  .then(response => {
		console.log("test");
		console.log(response);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => {
    console.log('データを受信');
		kimono = data;
		console.log(kimono);
  })
  .catch(error => {
    console.error('Fetchエラー:', error);
  });









const Debug = function() {};
Debug.log = function(str){
	console.log(str);
}
Debug.logr = function(str){
	console.log(str);
	console.log("\n");
}
Debug.logf = function(str){
	console.log("\n");
	console.log(str);
}

const header = document.getElementById('header');
const roomName = header.children[1].children[0].textContent;
const myName = header.children[2].children[0].textContent;
const showHeaderInfo = () => {
	Debug.logr("showHeaderInfo()を実行します。");
	Debug.log("room name : " + roomName);
	Debug.log("My name : " + myName);
	Debug.logf("¥nshowHeaderInfo()を実行しました。¥n");
}

const appId = '7ab8b490-382b-492e-bb0a-9324c3f9f86a'
const secret = 'S6MaSxEOJoQlM9JnfgowvhVbdsWIV9bz4WKW7fsftzc='

const token = new SkyWayAuthToken({
    jti: uuidV4(),
    iat: nowInSec(),
    exp: nowInSec() + 60 * 60 * 24,
    scope: {
        app: {
            id: appId,
            turn: true,
            actions: ['read'],
            channels: [
            {
                id: '*',
                name: '*',
                actions: ['write'],
                members: [
                    {
                        id: '*',
                        name: '*',
                        actions: ['write'],
                        publication: {
                            actions: ['write'],
                        },
                        subscription: {
                            actions: ['write'],
                        },
                    },
                ],
                sfuBots: [
                    {
                        actions: ['write'],
                        forwardings: [
                            {
                                actions: ['write'],
                            },
                        ],
                    },
                ],
            },
            ],
        },
    },
  
}).encode(secret);

(async () => {
	const localVideo = document.getElementById('local-video');
	const buttonArea = document.getElementById('button-area');
	const myId = document.getElementById('my-id');

	const { audio, video } = await SkyWayStreamFactory.createMicrophoneAudioAndCameraStream(
		{
			video: { 
				height: 640,
				width: 360, 
				frameRate: 15 
			},
		}
  );

	const joinMeeting = async () => {
		Debug.logr("joinMeeting()を実行します。");

		const context = await SkyWayContext.Create(token);
		const room = await SkyWayRoom.FindOrCreate(context, {
			type:'sfu',
			name : roomName
		});

		const member = await room.join();
		Debug.log(myName + "さんが入室しました。");
		myId.children[0].textContent=member.id;

		Debug.log("publishを試みます。");
		await member.publish(audio);
		await member.publish(video, {
			encodings: [
				// 複数のパラメータをセットする
				{ maxBitrate: 10_000, scaleResolutionDownBy: 8 },
				{ maxBitrate: 680_000, scaleResolutionDownBy: 1 },
			],
			maxSubscribers : 99,
		});
		Debug.log("publishが正常に実行されました。");
		
		const subscribeAndAttach = (publication) => {
			if (publication.publisher.id === member.id) return;

			const subscribeButton = document.createElement('button');
			const unsubscribeButton = document.createElement('button');

			subscribeButton.textContent = `subscribe :  ${publication.publisher.id}: ${publication.contentType}`;
			unsubscribeButton.textContent = `unsubscribe : ${publication.publisher.id}: ${publication.contentType}`;

			subscribeButton.className = `${publication.publisher.id}`;
			unsubscribeButton.className = `${publication.publisher.id}`;


			buttonArea.appendChild(subscribeButton);
			buttonArea.appendChild(unsubscribeButton);

			subscribeButton.onclick = async () => {
				Debug.logr("subscribeButton()が押されました。");
				const { subscription, stream } = await member.subscribe(publication.id);
				let newMedia;
				switch (stream.track.kind) {
					case 'video':
						newMedia = document.createElement('video');
						newMedia.playsInline = true;
						newMedia.autoplay = true;
						break;
					case 'audio':
						newMedia = document.createElement('audio');
						newMedia.controls = true;
						newMedia.autoplay = true;
						newMedia.style.display = "none";
						break;
					default:
						return;
				}
				unsubscribeButton.onclick = async () => {
					Debug.logr("unsunscribeButton()が押されました。");
					member.unsubscribe(subscription.id);
					newMedia.remove();
					Debug.logf("unsunscribeButton()が正常に実行されました。");
				}
				newMedia.className = `${publication.publisher.id}_remoteMedia`;
				stream.attach(newMedia);
				remoteMediaArea.appendChild(newMedia);
				Debug.logf("subscribeButton()が実行されました。");
			};

		};

		const deleteSubscribeAndUnsubscribe = (member) => {
			Debug.logr("イベントが発火されました。");

			let buttons = document.getElementsByClassName(member.id);
			let remoteMedias = document.getElementsByClassName(member.id + "_remoteMedia");

			for(let i=0, len=buttons.length; i < len; i++){
				console.log(buttons[i]);
				buttons[i].remove();
			}

			for(let i=0, len=remoteMedias.length; i < len; i++){
				console.log(remoteMedias[i]);
				remoteMedias[i].remove();
			}
			
			
			Debug.logf("イベントの発火が終了しました。");

		}
		
		room.onMemberLeft.add((e) => deleteSubscribeAndUnsubscribe(e.member));
		room.onClosed.add((e) => deleteSubscribeAndUnsubscribe(e.member));

		room.publications.forEach(subscribeAndAttach);
		room.onStreamPublished.add((e) => subscribeAndAttach(e.publication));

		Debug.logf("joinMeeting()を実行しました。");
	}
	joinMeeting();

	video.attach(localVideo); // 3
	await localVideo.play(); // 4
})(); // 1