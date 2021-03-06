import React, { useEffect, useState, useContext } from 'react'
import {DefaultButton, PrimaryButton, DangerButton, BrandButton} from 'pivotal-ui/react/buttons';
import moralis from "moralis";
import { ethers } from 'ethers'
import axios from 'axios';
import MOLCOMMONS_ABI from './CONTROLLER_ABI'
import {Panel} from 'pivotal-ui/react/panels';
import {Grid, FlexCol} from 'pivotal-ui/react/flex-grids';
import {Input} from 'pivotal-ui/react/inputs';
import {Checkbox} from 'pivotal-ui/react/checkbox';
import GAMMA_ABI from './GAMMA_ABI'
import o2x from 'object-to-xml';
import Web3 from 'web3';
import priceFeedABI from './priceFeedABI'

moralis.initialize(process.env.REACT_APP_MORALIS_APPLICATION_ID);
moralis.serverURL = process.env.REACT_APP_MORALIS_SERVER_URL;

const MintNFT = () => {
  // ----- useState
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sale, setSale] = useState('')
  const [ethPrice, setEthPrice] = useState('')
  const [coinPrice, setCoinPrice] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [compliance, setCompliance] = useState(false)
  const [metadata, setMetadata] = useState(null)
  const [account, setAccount] = useState('')
  const [chain, setChain] = useState('')


  const [connect, toggleConnect] = useState(false)
  const [imageHash, setImageHash] = useState('');
  const [imageUrl, setImageUrl] = useState('upload-image.png')
  const [commonsAddress, setCommonsAddress] = useState('') 
  const [message, setMessage] = useState('') 
  const [terms, setTerms] = useState('') 
  const [address,     setAddress]     = useState('')
  const [airdrop,                 setAirdrop              ] = useState(null)
  const [collaboratorRows,setCollaboratorRows] = useState();
  const [collaborators,setCollaborators] = useState([]);
  const [collaboratorAddresses,setCollaboratorAddresses] = useState([]);
  const [collaboratorSplits,setCollaboratorSplits] = useState([]);
  const [splitAmount,setSplit] = useState('');
  const [unlockLink, setUnlockLink] = useState();
  const [extension,     setExtension] = useState();
  const [tags,   setTags] = useState([]);
  const [size,   setSize] = useState();

  const [currentHorse,     setCurrentHorse] = useState();
  const [tagsApplied,     setTagsApplied] = useState([]);
  const [tagButtons,      setTagButtons] = useState([]);
  const [random,          setRandom] = useState([]);


  const provider = new ethers.providers.Web3Provider(window.ethereum);
  var web3 = new Web3(Web3.givenProvider);

  const Commons = moralis.Object.extend( "Commons", { /* Instance methods*/ },  {  });

  const NFT = moralis.Object.extend( "NFT", { /* Instance methods*/ }, {  
      newNFT: function(dict,fileHash,commonsContractAddress,gammaContractAddress,supply, txHash, fileName, extension) { 
      const nft = new NFT();
      nft.set( "fileHash",        fileHash                );
      nft.set( "metadata",        dict                    );
      nft.set( "title",           title                   );
      nft.set( "description",     description             );
      nft.set( "onsale",          sale                    );
      nft.set( "commonsAddress",  commonsContractAddress  );
      nft.set( "gammaAddress",    gammaContractAddress    );
      nft.set( "tokenIndex",      ( supply.toNumber() + 1 )  + ''   );
      nft.set( "ethPrice",        ethPrice                );
      nft.set( "coinPrice",       coinPrice               );
      nft.set( "unLockLink",      unlockLink              );
      nft.set( "txHash",          txHash                  );
      nft.set( "fileName",        fileName                );
      nft.set( "extension",       extension               );
      nft.set( "tags",            tags                    );
      nft.set( "size",            size                    );
      return nft; 
      }
   });
        
    const Tag = moralis.Object.extend( "Tag", { /* Instance methods*/ }, {  
        newTag: function(newTag) { 
            const tag = new Tag();
            tag.set( "tag",       newTag );
            return tag; 
       }
   });

  const signer = provider.getSigner()
  const checkMintable = async () => { 
      if ( title != '' && description != '' && ethPrice != ''   ){
          doMint();
      }else{
        alert( 'not mintable, need more info' );        //TODO
      }
  }

  const onFileChange = event => {
    var reader;
	setImageFile(event.target.files[0]);
    setExtension(event.target.files[0].name.substring(event.target.files[0].name.indexOf('.')));
    reader = new FileReader();
    reader.onload = function(e) { setImageUrl( e.target.result ); }
    reader.readAsDataURL(event.target.files[0]);
  };

  const doMint = async () => {   
    setMessage( 'Uploading to IPFS!' );
    const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
    let   data = new FormData();
    let fileName = '';
    let fileExtension = '';
    if ( currentHorse ){
        fileName = ( 'test' + random ).substring( 0, 10 ) + '.svg';
        var svgBlob = new Blob([currentHorse], {type:"image/svg+xml;charset=utf-8"});
        data.append("file", svgBlob , fileName );
        fileExtension = 'svg' 
    }else{
       data.append("file", imageFile, imageFile.name );
       fileName = imageFile.name;
       fileExtension = imageFile.name.substring( imageFile.name.indexOf( '.' ) )
    }
                                    


    const res = await axios.post(   url, data, {  maxContentLength: "Infinity", 
        headers: { "Content-Type": `multipart/form-data; boundary=${data._boundary}`,
        pinata_api_key: process.env.REACT_APP_PINATA_PUBLIC,
        pinata_secret_api_key: process.env.REACT_APP_PINATA_PRIVATE,            },   });
        console.log(res.data);
        setImageHash( res.data.IpfsHash );
        setImageUrl( 'https://gateway.pinata.cloud/ipfs/' + res.data.IpfsHash );
        setMessage( 'Successfully uploaded to IPFS. Now Minting NFT! Please Wait!' );
        try{           
            uploadAndMint(res.data.IpfsHash,fileName,fileExtension)
        }catch (e){ 
            console.log('error is - ' + e) 
        }
    }

  // ----- Upload tokenURI and Mint NFT
  const uploadAndMint = async (hash,filename,extension) => {
      const baseUrl = 'https://ipfs.io/ipfs/'
      // Add timestamp to metadata
      const date = new Date()
      const timestamp = date.getTime()
      const dict = { ...metadata, image: baseUrl + hash, createdAt: timestamp }
      console.log('tokenURI at mint is - ', dict)
      var contractaddress = getCommonsAddress();
      try {
          const tokenUri = baseUrl + hash
          console.log(tokenUri)
          const p = ethers.utils.parseEther(ethPrice)
          molCommons(p, tokenUri, contractaddress, dict, hash,filename,extension )
      } 
      catch (e) { console.log('error is - ' + e ) }
  }

 // ----- Mint Gamma with MolVault
   const molCommons = 
   async (price, tokenURI, commonsContractAddress, dict, fileHash,filename,extension ) => {
    console.log('MolVault contract is - ', commonsContractAddress)
    const _contract = new ethers.Contract(commonsContractAddress, MOLCOMMONS_ABI, signer)
    try{
      var gamma = await _contract.gamma();
      const gamma_contract = new ethers.Contract(gamma, GAMMA_ABI, signer)
      const supply = await gamma_contract.totalSupply();
      const saleNumber = ( sale === 'on' ) ? 1 :0;
      const tx = await _contract.mint( price, tokenURI, saleNumber, await signer.getAddress(), 0, [], []  )                                                    

      console.log('tx.hash for minting - ' + tx.hash)
      setMessage( 'Waiting for confirmation' );
 
     tx.wait().then((receipt) => { 
         console.log('mint receipt is - ', receipt)
         const newNFT = NFT.newNFT( dict, fileHash, commonsContractAddress, gamma, supply, tx.hash, filename, extension );
         newNFT.save();
       }).then(() =>{ 
          document.getElementById( 'loading' ).style.display = 'none';
          setMessage( <BrandButton href={ '/deChess/wallet/' } >NFT Minted! View Here</BrandButton> );
          })
        } catch (e) {  console.log(e)  }
     }
   //  const callbackFunction = (user,address) => {  setUser(user); setAddress(address); }

    function getCommonsAddress()
    {
        const  address = process.env.REACT_APP_COMMONS_CONTRACT
        return address;
    }

    const getTags = async () => {
        const query = new moralis.Query( Tag );
        const results = await query.find();
        var tagButtons = [];
        for ( var i = 0; i < results.length; i++ ){
          tagButtons.push( results[i].get( "tag" ) );
        }
       setTagButtons( tagButtons.map((tag,i) =><li className="tagButtons" key={i}><BrandButton onClick={() => { addTag(tag)} } >{tag}</BrandButton></li> ));
    }

    const addTag = async (_tag) =>
    {
        var tagButtons = [];
        const query = new moralis.Query( Tag );
        query.equalTo( "tag", _tag );
        const results = await query.find();
        if ( results.length === 0 ){
            const tagObject = Tag.newTag(_tag);
            await tagObject.save();
        }
        tags.push( _tag );
        setTagsApplied( tags.map((tag,i) =><li className="tagButtons" key={i}><BrandButton>{tag}</BrandButton></li> ));
        setTags( tags );
}

    const bah = (rand) => {
        var currentdate = new Date();
        const newHorse = buildAHorse(rand)
        setRandom( rand );
        setCurrentHorse( newHorse );
      //  console.log( o2x( currentHorse ) );
        document.getElementById( 'imageDiv' ).innerHTML = newHorse;
}

    var oldResult = '';
    const priceFeedAddress = '0xf8B00745E4108eC18ee3a97f304F49af2C367EdA';
    const getVRF = async () => {
       document.getElementById( 'imageDiv' ).innerHTML = '<img id="preview" src="./link.png" /><br/><br/>Waiting for Chainlink VRF!<br/><img src="loading.gif" />';
        var localAddress = await signer.getAddress();
        const priceFeedInstance = await new web3.eth.Contract( priceFeedABI, priceFeedAddress, {from:localAddress} ); 
        oldResult = await priceFeedInstance.methods.randomResult().call();
        console.log('old result is ' + oldResult );
        await priceFeedInstance.methods.getRandomNumber().send();
        await waitForVRF();
}
    var result = 0;
    const waitForVRF = async () => {
        setTimeout(async function(){ result = await getVRFResult();  if ( result === oldResult ) { waitForVRF() }  else { document.getElementById( 'imageDiv' ).innerHTML = '';console.log('got our number ' + result ); bah(result);} }, 3000);
}

const getVRFResult = async () => {
    var localAddress = await signer.getAddress();
    const priceFeedInstance = await new web3.eth.Contract( priceFeedABI, priceFeedAddress, {from:localAddress} ); 
    const random = await priceFeedInstance.methods.randomResult().call();
    console.log('getting result new > ' + result + '  old > '+ oldResult );
    return random;
}

const ethEnabled = () => {
  if (window.web3) {
    window.web3 = new Web3(window.web3.currentProvider);
    window.ethereum.enable();
    return true;
  }
  return false;
}


  useEffect( async () => { 
                      await  ethEnabled();
                        getTags(); }
, [tags,tagsApplied])

  return (
    <div className="App full-height" >
                        <Panel >
        <Grid className="grid-show">
            <FlexCol fixed {...{style: {width: '20%'}}}>
      
                    <div id="imageDiv"><img id="preview" src={imageUrl} /><br/><br/><h1 id="vrfmessage"></h1><div id="loading"></div></div>
              
    
            </FlexCol>
            <FlexCol {...{style: {padding: '8px'}}} >
         <Grid className="grid-show">
            <FlexCol fixed {...{style: {width: '35%'}}}/>
            <FlexCol {...{style: {padding: '8px'}}} ><span className="label" >Title</span><Input placeholder='Enter Title' type="text" value={title} onChange={(e) => setTitle(e.target.value)} /></FlexCol>
            <FlexCol />
        </Grid>
        <Grid className="grid-show">
            <FlexCol fixed {...{style: {width: '35%'}}}/>
            <FlexCol {...{style: {padding: '8px'}}} ><span className="label" >Description</span><Input placeholder='Enter Description'  type="text" value={description} onChange={(e) => setDescription(e.target.value)} /></FlexCol>
            <FlexCol />
        </Grid>
        <Grid className="grid-show">
            <FlexCol fixed {...{style: {width: '35%'}}}/>
            <FlexCol {...{style: {padding: '8px'}}} ><Checkbox type='Checkbox' onChange={(e) => setSale(e.target.value)} ><span>Put on sale?</span></Checkbox></FlexCol>
            <FlexCol />
        </Grid>
        <Grid className="grid-show">
            <FlexCol fixed {...{style: {width: '35%'}}}/>
            <FlexCol {...{style: {padding: '8px'}}} ><span className="label" >Price in ??</span><Input placeholder='Enter amount in ??'  type="text" value={ethPrice} onChange={(e) => setEthPrice(e.target.value)} /></FlexCol>
            <FlexCol />
        </Grid>
         <Grid className="grid-show">
            <FlexCol fixed {...{style: {width: '35%'}}}/>
            <FlexCol {...{style: {padding: '8px'}}} ><span className="label" >Collection Size</span><Input placeholder='Enter Collection Size'  type="text" value={size} onChange={(e) => setSize(e.target.value)} /></FlexCol>
            <FlexCol />
        </Grid>
        <Grid className="grid-show">
            <FlexCol fixed {...{style: {width: '35%'}}}/>
            <FlexCol {...{style: {padding: '8px'}}} ><span className="label" >Tags</span>{tagsApplied}<br/>
            </FlexCol>
            <FlexCol />
        </Grid>
        <Grid className="grid-show">
            <FlexCol fixed {...{style: {width: '35%'}}}/>
            <FlexCol {...{style: {padding: '8px'}}} ><Input type="file" onChange={onFileChange} /></FlexCol>
           <FlexCol></FlexCol>
        </Grid>
        <Grid className="grid-show">
            <FlexCol fixed {...{style: {width: '35%'}}}/>
            <FlexCol {...{style: {padding: '8px'}}} ><PrimaryButton onClick={(e) => {bah(new Date().getTime());} } id="randButton" >Pretend Random</PrimaryButton><br/><br/> <PrimaryButton onClick={(e) => {getVRF();} } id="vrfButton" >Chainlink VRF</PrimaryButton><br/><br/><PrimaryButton onClick={(e) => {checkMintable();} } id="mintButton" >Mint</PrimaryButton><br/></FlexCol>
            <FlexCol />
        </Grid>
          </FlexCol>
            <FlexCol> 
                <Grid className="grid-show">
                <FlexCol fixed {...{style: {width: '35%'}}}/>
                <FlexCol {...{style: {padding: '8px'}}} ><BrandButton href="/" >Home</BrandButton> <br/></FlexCol>
                <FlexCol />
                </Grid><br/>
                
                <Grid className="grid-show">
                <FlexCol fixed {...{style: {width: '35%'}}}/>
                <FlexCol {...{style: {padding: '8px'}}} >
                    <form onSubmit={(e)=>{e.preventDefault();addTag(document.getElementById('newtag').value);}} >
                        <Input placeholder='Enter a new Tag' type="text" id="newtag" /><br/>  <BrandButton type="submit" >New Tag</BrandButton>
                    </form>
                </FlexCol>
                <FlexCol />
                </Grid>
                <Grid className="grid-show">
                <FlexCol fixed {...{style: {width: '35%'}}}/>
                <FlexCol {...{style: {padding: '8px'}}} ><h2>Tags</h2><ul>{tagButtons}</ul><br/><br/>{message}<br/><br/><div id="loading" ><img  src="loading.gif" /></div></FlexCol>
                <FlexCol />
                </Grid><br/></FlexCol>
        </Grid>
     </Panel>
   </div>
  )

function buildAHorse(num) {
    const horseParts = {
        horn: '<path id="horn" class="cls-2" d="M137.52,109.69c-2.55-.14-3.85-2-5.34-4.32S128,97.84,128.36,95c0-.31.2-1.45-.48-2a1.32,1.32,0,0,0-.87-.21c-2.18.06-6.86-6.23-6.44-10.29a3,3,0,0,0-.42-2.19,2.64,2.64,0,0,0-1.45-.78c-3-.93-5.37-6.71-5.56-8.91a3.47,3.47,0,0,0-.53-1.65,3.25,3.25,0,0,0-1.12-1c-2-1.18-6.24-6.56-6.14-9.81a2.67,2.67,0,0,0-.48-1.86,2.24,2.24,0,0,0-1.17-.7c-2.69-.8-7.33-7.54-6.52-10.45a2,2,0,0,0,0-1.54A1.81,1.81,0,0,0,96,43c-3.3-.73-6.7-11.14-6.7-11.14-3.8-11.61-5.77-13.94-4.79-14.65,1.91-1.41,10.09,7,13,9.94,4.7,4.81,6.76,8.46,7.08,9.36a4.25,4.25,0,0,0,.61,1.13,4.36,4.36,0,0,0,1.59,1.26C109,40,115,45.3,114.34,48a1.7,1.7,0,0,0,0,1.26c.36.68,1.34.81,1.66.86,3.47.61,8.6,7,8.19,9.69a1.22,1.22,0,0,0,1.47,1.69c2.72-.06,7,5.73,6.7,8.47a2.42,2.42,0,0,0,.2,1.36,2.8,2.8,0,0,0,1.52,1.22c2.68,1.09,7.41,5.77,7.15,8.62a2,2,0,0,0,.19,1.36,2.61,2.61,0,0,0,2,.89c2.21.26,3,2.91,6.2,6.6s4.84,3.92,4.8,6.31a7.52,7.52,0,0,1-1.19,3.57c-2.64,4.81-8,7.12-11.3,8.52C139.87,109.33,138.83,109.76,137.52,109.69Z" /><path id="hornGroove1" class="cls-2" d="M104.87,56.35a22,22,0,0,0,5.48-3.06,21.21,21.21,0,0,0,4-4" /><path id="hornGroove2" class="cls-2" d="M97.14,43.66a15.62,15.62,0,0,0,5.31-3,14.57,14.57,0,0,0,2.69-3.07" />',
        body: '<path id="body" class="cls-4" d="M152.45,128.62a32.75,32.75,0,0,1-4.7,7.81,34.61,34.61,0,0,1-7.84,7,32.94,32.94,0,0,1-9,4.3c-9.18,2.59-12.14-2.58-20.65-.88-7.53,1.51-12.85,7.06-14.82,9.12-6,6.22-6.25,11.4-11.4,12.54-2.83.63-6.82,0-8-2.28a4.46,4.46,0,0,1,0-3.42c2.59-8,12.45-17.19,12.54-17.1a33.42,33.42,0,0,0-8,8c-1.66,2.31-2.92,4.63-5.92,7.2-1.69,1.45-2.53,2.2-3.59,2.39-5.36,1-13.15-7.58-13.15-15.55,0-4.47,2.35-7.84,4.78-10.76C90,104.19,91.12,99.23,91.45,96.32c.73-6.39-1.31-11,2.4-15.55,2.32-2.83,4.71-2.91,10.76-6,7.49-3.8,8.71-6.15,14.35-9.57,0,0,8.31-5,21.53-7.17,12.59-2,22.57,1.74,29.48,4.16a86,86,0,0,1,23.14,12.58,87.68,87.68,0,0,1,20.27,19.4c7.55,10.16,10.8,19.47,13.06,26.13,4.15,12.2,5.08,21.89,5.94,30.87a186.15,186.15,0,0,1,0,33.25,195,195,0,0,1-3.56,23.75c-3.45,16.09-5.44,15.28-7.13,26.12-2.55,16.39.41,28.43-3.56,29.69-1.51.48-3.15-.87-3.56-1.19C201,252.47,92.34,276.15,85.47,254.18c-5.84-18.73,19.64-56.56,44.25-73,4.95-3.29,14.93-10,20.33-22.73C154.77,147.45,153.94,136.38,152.45,128.62Z" />',
        eye: {
            shape: '<path id="eye" class="cls-5" d="M119.24,82.55c-2.82-.49-9.36-1.36-14.2,1-2.65,1.28-5.61,3.92-4.25,5.28,1.62,1.63,9.58,1.62,14.2-1A8.6,8.6,0,0,0,119.24,82.55Z"',
            white: ' style="fill: black; stroke: black;"/>',
            black: ' style="fill: white; stroke: white;"/>',
        },
        nostril: {
            shape: '<path d="M78.49,140.42c.22-.48.44-.95.67-1.42a8.93,8.93,0,0,1,.72-1.28l-.47.61a3.47,3.47,0,0,1,.6-.55,4.07,4.07,0,0,0,1-1.26,3.15,3.15,0,0,0,.3-2.31,2.27,2.27,0,0,0-.53-1,2.33,2.33,0,0,0-.85-.77,3,3,0,0,0-4.1,1.07,1.73,1.73,0,0,1-.2.32l.47-.6a6.07,6.07,0,0,1-.65.59,5.22,5.22,0,0,0-.77.92,3.82,3.82,0,0,0-.29.48c-.4.71-.74,1.45-1.09,2.19a2.34,2.34,0,0,0-.35,1.12,2.66,2.66,0,0,0,.59,2.21,2.15,2.15,0,0,0,.84.77,3,3,0,0,0,2.31.31,3,3,0,0,0,1.8-1.38Z"',
            white: ' style="fill: black; stroke: black;"/>',
            black: ' style="fill: white; stroke: white;"/>',
        },
        backEars: [
            '<path id="backEar1" class="cls-1" d="M134.27,59.54c3-5.93,6.59-13,10.78-21.09s5.22-9.81,6.61-9.72c4.06.25,8.21,15.8,5.27,29.87a43,43,0,0,1-2.35,7.64" />',
            '<path id="backEar2" class="cls-1" d="M136,70a59.45,59.45,0,0,1-4.31-23.9c.16-5.52.4-13.32,3.31-14.1,4.24-1.14,13,13,16.31,26.83a56.69,56.69,0,0,1,1.3,7.89" />',
            '<path id="backEar3" class="cls-1" d="M135,68a29.83,29.83,0,0,1-2-15c.38-2.88,1.32-10,5-11,4.65-1.27,10.42,8,11,9a29,29,0,0,1,4,16" />',
        ],
        frontEars: [
            '<path id="frontEar1" class="cls-1" d="M149.74,66.16C156,55.78,160.51,47.07,163.6,40.83c3.54-7.14,5-10.71,7.24-10.65,4,.1,7.79,11.78,7.76,21.55a40.89,40.89,0,0,1-5.41,19.84" />',
            '<path id="frontEar2" class="cls-1" d="M145,66a63.07,63.07,0,0,1,2.35-21c1.1-3.81,4.07-14.06,7.65-14,3.74.1,6.22,11.42,7,15a63.58,63.58,0,0,1,1,21" />',
            '<path id="frontEar3" class="cls-1" d="M146,65a31.58,31.58,0,0,1,0-10c.76-4.68,3.48-14.65,8-15,4.3-.34,8.85,8.14,10,15a25.2,25.2,0,0,1-1,12"/>',
        ],
        hairs: [
            '<path id="hair1" class="cls-3" d="M151,70.73c.82-3.31,3.67-12.89,12.7-19.05,7.56-5.16,15.42-5.15,20.32-5.08,30.29.45,53,27.85,52.07,29.21-.37.54-4.47-2.83-11.43-2.54a19.82,19.82,0,0,0-6.35,1.27c-11.49,4.68-31.32-6.08-31.75-5.08s12.78,10.79,31.75,11.43c4.12.14,3.9-.31,6.35,0,18.79,2.43,28.91,28.92,30.48,33,6.94,18.17,5.22,35.36,3.81,35.56-1.12.16-.19-10.62-7.62-16.51-8.27-6.55-20.55-2-24.13-8.89A14.48,14.48,0,0,1,226,119s.66,3.25,1.27,5.08c2.52,7.56,10.48,9.28,16.51,14,9.71,7.57,11.57,20.6,12.7,29.21a60.86,60.86,0,0,1-2.54,26.67c-.52,1.73-3.11,10.42-5.08,10.16-1.46-.18-1.29-5.29-2.54-11.43-2.91-14.31-11.8-24.58-12.7-24.13s4.47,8.85,7.62,24.13c2.85,13.83,1.64,21.9,1.27,24.13A55.39,55.39,0,0,1,237.39,232c-2.61,5.22-7.81,13.55-10.16,12.7-1.46-.52-.87-4.22-1.27-10.16a63.91,63.91,0,0,0-3.81-17.78" />',
            '<path id="hair2" class="cls-3" d="M155,79c0-2,.11-8.8,5-13,1.94-1.66,5.1-3.32,14-3a70.48,70.48,0,0,1,26,6c15.21,7,27.2,17.94,26,20-.85,1.46-7.3-3.36-17-2-9.39,1.31-16.58,7.68-16,9s9.13-4.14,21-3c14.33,1.38,25.95,11.76,25,14-.49,1.15-4-.52-11,0-10.53.78-19.34,5.6-19,7,.26,1.09,5.85-.55,16,1,5,.76,7.9,1.2,11,3,8.71,5,12.37,17,10,19-1.89,1.57-6.18-4.46-14-4-7,.41-12.5,5.79-12,7s6.21-1.8,15,0a17.14,17.14,0,0,1,6,2c8.44,5.22,8.72,21,6,22-2.05.77-4.06-7.46-12-10-7.15-2.28-15.1,1.32-15,3s9.33-.32,16,5c10.64,8.49,7.91,30.42,5,31-1.55.31-2.26-5.63-9-12-5.25-5-12-8.15-13-7s3.6,4.71,8,12c2.36,3.91,11.87,19.68,6,32-2.37,5-7,8.87-9,8-2.52-1.09-.8-9.65-4-22-.52-2-1.33-4.72-3-5s-3.55,2.31-4,3" transform="translate(12, -8) scale(1, 1.1)"/>',
            '<path id="hair3" class="cls-3" d="M134,66c1.53-3.1,5.92-10.88,15-15,11.83-5.36,28-2.83,32,5,3.16,6.18-2.24,13.7,1,16,2.62,1.87,6.54-2.79,13-3,8-.25,17.42,5.19,19,12,1.81,7.81-7.55,13.76-5,18,2.41,4,10.95-.94,18,4,5.85,4.1,8,13.15,7,20-1.47,9.82-9,11.89-8,19,.77,5.22,5,5,9,13,1.29,2.58,5.29,10.53,3,18-2.84,9.27-12.56,8.63-14,16-1.66,8.51,10.63,12.63,10,23-.36,5.82-4.57,9.88-13,18a93.79,93.79,0,0,1-17,13" transform="translate(11, -1)"/>',
            '<path id="hair4" class="cls-3" d="M161.5,62.5c12.05-13.92,17.9-15.22,21-14,5.06,2,2.92,10.69,10,16,7.58,5.68,15.21-.42,21,5,6.17,5.78.45,15.42,7,21,5.06,4.31,11.25.79,14,5,2.92,4.48-3.41,9.51-1,16,2.59,7,11.95,6.24,13,12,1,5.29-6.59,7.7-6,14,.57,6.12,8,7.29,8,13,0,4.85-5.38,5.53-6,11-.73,6.43,6.34,8.44,6,15-.33,6.37-7.13,7-8,14-.84,6.81,5.23,9,4,15-1.33,6.48-8.95,6.63-10,13-.91,5.53,4.41,8,4,13-.29,3.58-3.49,8.63-18,14"/>	<path class="cls-4" d="M152.45,128.62a32.75,32.75,0,0,1-4.7,7.81,34.61,34.61,0,0,1-7.84,7,32.94,32.94,0,0,1-9,4.3c-9.18,2.59-12.14-2.58-20.65-.88-7.53,1.51-12.85,7.06-14.82,9.12-6,6.22-6.25,11.4-11.4,12.54-2.83.63-6.82,0-8-2.28a4.46,4.46,0,0,1,0-3.42c2.59-8,12.45-17.19,12.54-17.1a33.42,33.42,0,0,0-8,8c-1.66,2.31-2.92,4.63-5.92,7.2-1.69,1.45-2.53,2.2-3.59,2.39-5.36,1-13.15-7.58-13.15-15.55,0-4.47,2.35-7.84,4.78-10.76C90,104.19,91.12,99.23,91.45,96.32c.73-6.39-1.31-11,2.4-15.55,2.32-2.83,4.71-2.91,10.76-6,7.49-3.8,8.71-6.15,14.35-9.57,0,0,8.31-5,21.53-7.17,12.59-2,22.57,1.74,29.48,4.16a86,86,0,0,1,23.14,12.58,87.68,87.68,0,0,1,20.27,19.4c7.55,10.16,10.8,19.47,13.06,26.13,4.15,12.2,5.08,21.89,5.94,30.87a186.15,186.15,0,0,1,0,33.25,195,195,0,0,1-3.56,23.75c-3.45,16.09-5.44,15.28-7.13,26.12-2.55,16.39.41,28.43-3.56,29.69-1.51.48-3.15-.87-3.56-1.19C201,252.47,92.34,276.15,85.47,254.18c-5.84-18.73,19.64-56.56,44.25-73,4.95-3.29,14.93-10,20.33-22.73C154.77,147.45,153.94,136.38,152.45,128.62Z" />',
        ],
        base: '<path class="cls-1" d="M235.08,283V263.87a14.31,14.31,0,0,0-4.21-10.14,14.75,14.75,0,0,0-10.14-4.22H82a14.4,14.4,0,0,0-14.36,14.36v18.52H235.08V266.84" />',
        stripe1: '<path class="cls-6" d="M116.54,212.41c-.42-.72,11.36-6.42,23.94-18.24,5-4.7,10.42-9.8,14.82-17.1,11.53-19.16,7.75-39.9,9.12-39.9,1.13,0,3.22,11.55,1.14,23.94A52,52,0,0,1,161,175.93c-4,8.13-9.07,12.88-14.82,18.24a94.67,94.67,0,0,1-17.1,12.54C123.35,210,116.84,213,116.54,212.41Z" />',
        stripe2: '<path class="cls-6" d="M215.68,196.24c2.59-15.36,4.13-23.45,3.56-35.62-.25-5.42-.87-10.75-1.78-18.41-2.18-18.54-4.1-26-3.56-26.12.83-.2,8.06,17.9,9.5,40.37a122.52,122.52,0,0,1-1.19,27.31c-1,6.23-2,9.3-4.15,17.22-6.14,23-8.55,38.66-8.91,38.6S212.36,216,215.68,196.24Z" />',
        stripe3: '<path class="cls-7" d="M149.85,115.23a39.09,39.09,0,0,1-9.5,14.25c-2.85,2.79-8.44,8.27-16.63,9.5a25.86,25.86,0,0,1-11.87-1.18c0,.12,9.09,4.78,17.81,2.37C144,136.21,149.84,115.23,149.85,115.23Z" />',
    };

    const numArr = Array.from(String(num), Number);

    while (numArr.length < 18) {
        numArr.push(0);
    }

    const color = numArr[2] <= 4 ? 'white' : 'black';

    const horn = numArr[3] === 7;

    let ear = 0;
    if (numArr[4] <= 1) { // 2 in 10 chance
        ear = 0;
    } else if (numArr[4] <= 4) { // 3 in 10 chance
        ear = 1;
    } else { // 5 in 10 chance
        ear = 2;
    }

    let hair = 0;
    if (numArr[5] === 0) { // 1 in 10
        hair = 0;
    } else if (numArr[5] <= 2) { // 2 in 10
        hair = 1;
    } else if (numArr[5] <= 5) { // 3 in 10
        hair = 2;
    } else { // 4 in 10
        hair = 3;
    }

    // 0 1 2 3 4 5 6 7 8 9 A B C D E F
    // 0 1 3 5 6 8 A C E F
    // removed 2, 4, 7, 9, B, D
    const chars = ['0', '1', '3', '5', '6', '8', 'A', 'C', 'E', 'F'];

    let hairColor = '#';
    for (let i = 6; i < 12; i += 1) {
        hairColor += chars[numArr[i]];
    }

    let lineColors = '#';
    for (let i = 12; i < 18; i += 1) {
        lineColors += chars[numArr[i]];
    }

    const horse = `<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">
                    <defs>
                        <style>
                            .cls-1,.cls-2,.cls-4 {
                                fill: ${color === 'white' ? '#fff' : '#000'};
                            }
                            .cls-1,.cls-2,.cls-3,.cls-4,.cls-5 {
                                stroke: ${color === 'white' ? '#000' : '#fff'};
                            }
                            .cls-1,.cls-2,.cls-3,.cls-4,.cls-5,.cls-6,.cls-7 {
                                stroke-miterlimit: 10;
                            }
                            .cls-1 {
                                stroke-width: 6px;
                            }
                            .cls-2,.cls-3 {
                                stroke-width: 5px;
                            }
                            .cls-3 {
                                fill: ${hairColor};
                            }
                            .cls-4 {
                                stroke-width:7px
                            }
                            .cls-6,.cls-7{
                                fill: ${lineColors};
                                stroke: ${lineColors};
                            }
                            .cls-6{
                                stroke-width: 4px;
                            }
                        </style>
                    </defs>
                    ${horseParts.backEars[ear]}
                    ${horn ? horseParts.horn : ''}
                    ${horseParts.hairs[hair]}
                    ${horseParts.body}
                    ${horseParts.base}
                    ${horseParts.frontEars[ear]}
                    ${horseParts.eye.shape}
                    ${color === 'white' ? horseParts.eye.white : horseParts.eye.black}
                    ${horseParts.nostril.shape}
                    ${color === 'white' ? horseParts.nostril.white : horseParts.nostril.black}
                    ${horseParts.stripe1 + horseParts.stripe2 + horseParts.stripe3}
                </svg>
                <!--seed: ${numArr}, hair color: ${hairColor}, accent colors: ${lineColors}, horn: ${horn}, ear type: ${ear}, hair type: ${hair} -->`;

    return horse;
}

}

export default MintNFT
