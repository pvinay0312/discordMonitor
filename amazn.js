import got from "got";
import HTMLParser from "node-html-parser";
import promptSync from "prompt-sync";
const prompt = promptSync();
import puppeteer from "puppeteer";

import { Webhook, MessageBuilder } from "discord-webhook-node";
import { Channel, MessageEmbed } from "discord.js";
//https://www.amazon.com/Eluktronics-MAX-17-Processor-Graphics/dp/B097NRXCFR,  https://www.amazon.com/Pioneer-Photo-Albums-Magnetic-Self-Stick/dp/B003WSWFBY,  https://www.amazon.com/nVidia-Computing-Accelerator-Processing-Kepler/dp/B008X8Z95W;
//https://www.amazon.com/Newest-Sony-Playstation-Version-Console/dp/B09PMZ9JBJ


import express from "express";
import bodyParser from "body-parser";
  
// New app using express module
const app = express();
app.use(bodyParser.urlencoded({
    extended:true
}));

async function Monitor(productLink) {
    var myHeaders = {
        'connection' : 'keep-alive',
        'sec-ch-ua' : `"Not;A Brand";v="99", "Google Chrome";v="97", "Chromium";v="97"`,
        'sec-ch-ua-mobile': '?0',
        'upgrade-insecure-requests': 1,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-user': '?1',
        'sec-fetch-dest': 'document',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'en-US,en;q=0.9',
        'rtt': 0,      
        'ect': '4g', 
        'downlink': 10
    }
    const response = await got(productLink, {
        headers: myHeaders
    });
    if(response && response.statusCode == 200) {
        let root = HTMLParser.parse(response.body);
        let availabilityDiv = root.querySelector('#offerListingID').getAttribute('value')   ;
        console.log("ID", availabilityDiv)

         let sku = root.querySelector('#ASIN').getAttribute('value');
         console.log("SKU", sku)
        if(root){
            let productImageURL = root.querySelector('#landingImage').getAttribute('src');
            let productName = root.querySelector('#title').getElementsByTagName('span')[0].innerText;
            console.log("name", productName)
            //let atc = root.querySelector('#addToCart').getAttribute('action').innerHTML;
           // console.log("atc", app.get)
            if(availabilityDiv == '') {    
                console.log(availabilityDiv + ": OUT OF STOCK");
            } else if (availabilityDiv == root.querySelector('#offerListingID').getAttribute('value')){
                 let price =  root.querySelector('#corePrice_feature_div > div > span > span.a-offscreen').innerText;
                console.log("price", price)
                const hook = new Webhook("https://discordapp.com/api/webhooks/937118031035920444/mwEw7KDffFjPAsjWBeMutD5zMf4OWCnxSUF7vr9h62yPB4X33xYAz1-Pdl0PK8cVRwF7");
                const embed = new MessageBuilder()
                    .setAuthor("Amazon Monitor", "https://upload.wikimedia.org/wikipedia/commons/d/de/Amazon_icon.png")
                    .setColor('#90ee90')
                    .setTimestamp()
                    .setThumbnail(productImageURL)
                    .addField(productName, productLink, true)
                    .addField('Availability', 'IN STOCK', false)
                    .addField('SKU' ,sku, true)
                    .addField('Offer ID', availabilityDiv)
                    .addField('Price', price)
                hook.send(embed);
                console.log(productName + ": IN STOCK");
            } 
        }   
    }

    await new Promise(r => setTimeout(r,8000));
    Monitor(productLink);
    return false;
    //console.log(response.statusCode); 
}

async function Run() {
    var productLinks = prompt("Enter links to monitor (separate by coma): ");
    var productLinksArr = productLinks.split(',');
    for(var i = 0; i < productLinksArr.length; i++) {
        productLinksArr[i] = productLinksArr[i].trim();

    }
    //productLinksArr = newArray;
    console.log(productLinksArr);

    var monitors = []  //array of promises

    productLinksArr.forEach(link => {
        var p = new Promise((resolve, reject) => {
            resolve(Monitor(link));
        }).catch(err => console.log(err));

        monitors.push(p);
    });

    console.log('Now monitoring ' + productLinksArr.length + ' items');  
    await Promise.allSettled(monitors);
}

Run();


//https://www.amazon.com/dp/B07ZK69HDK/ref=olp-opf-redir?aod=1&f_new=true&f_primeEligible=true&tag=mms321-20&m=ATVPDKIKX0DER, https://www.amazon.com/dp/B09R2NWCV1/ref=olp-opf-redir?aod=1&f_new=true&f_primeEligible=true&tag=mms321-20&m=ATVPDKIKX0DER, https://www.amazon.com/dp/B08Q64VSJ7/ref=olp-opf-redir?aod=1&f_new=true&f_primeEligible=true&tag=mms321-20&m=ATVPDKIKX0DER, https://www.amazon.com/dp/B08HJRF2CN/ref=olp-opf-redir?aod=1&f_new=true&f_primeEligible=true&tag=mms321-20&m=ATVPDKIKX0DER