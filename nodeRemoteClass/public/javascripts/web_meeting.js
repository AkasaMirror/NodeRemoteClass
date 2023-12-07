//HTTPリクエストのURL
const getToken_url = "/meeting/getToken";

//作成したイベント
const fetchAuthTokenEventName = "fetchAuthTokenEvent";

//作成したイベントのイベントとしての登録
const fetchAuthTokenEvent = new Event(fetchAuthTokenEventName);

//Skywayのクラスを擬似的なimport
const { uuidV4, nowInSec, SkyWayAuthToken, SkyWayContext, SkyWayRoom, SkyWayStreamFactory} = skyway_room;

//fetchする際のパラメータの記述
const fetchParam = {
	method : 'POST',
	headers: {
    'Content-Type': 'application/json',
  }
}

//デバッグする際のコンソール作成
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

//ページがロードされた際の処理
window.onload = () => {
	let getToken = "kimono"; //受け取ったトークンを受け取る変数
	const header = document.getElementById('header');
	const roomName = header.children[1].children[0].textContent;
	const myName = header.children[2].children[0].textContent;
	
	const authentication = async () => {
		fetchParam.body = JSON.stringify({
			sessionToken : '4CXS0f19nvMJBYK05o3toTWtZF5Lfd2t6Ikr2lID',
			channelName : roomName,
			memberName : myName
		});
		await fetch(getToken_url, fetchParam)
			.then(response => {
				console.log("Tokenをゲットするfetch()を行いました。");
				if (!response.ok) {
					throw new Error('Network response was not ok');
				}
				return response.json();
			})
			.then(credential => {
				console.log("authToken : " + credential.authToken);
				getToken = credential.authToken;
				document.dispatchEvent(fetchAuthTokenEvent);
			})
			.catch(error => {
				console.log('Fetchエラー:', error);
			});
		}
	authentication();

	//tokenをフェッチしてきた際にルームが作成されるようにする。
	document.addEventListener(fetchAuthTokenEventName, async () => {
		const token = getToken;

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
			Debug.log("contextを作成");
			const room = await SkyWayRoom.FindOrCreate(context, {
				type:'p2p',
				name : roomName
			});
			Debug.log("roomを作成");
	
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

	});
}