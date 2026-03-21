import got from "got";
import HTMLParser from "node-html-parser";
import promptSync from "prompt-sync";
const prompt = promptSync();

import { Webhook, MessageBuilder } from "discord-webhook-node";

// Set AMAZON_WEBHOOK_URL in your .env file — never hardcode tokens
const DISCORD_WEBHOOK_URL = process.env.AMAZON_WEBHOOK_URL;
if (!DISCORD_WEBHOOK_URL) throw new Error('Missing env var: AMAZON_WEBHOOK_URL');

const notificationCooldown = 3600 * 1000; // 1 hour
const lastNotificationTimes = {};

async function Monitor(productLink) {
    try {
        const response = await got(productLink, {
            headers: {
                'connection': 'keep-alive',
                'sec-ch-ua': `"Chromium";v="118", "Google Chrome";v="118", "Not=A?Brand";v="99"`,
                'sec-ch-ua-mobile': '?0',
                'upgrade-insecure-requests': 1,
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'sec-fetch-site': 'same-origin',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-user': '?1',
                'sec-fetch-dest': 'document',
                'Sec-Ch-Ua-Platform': `"macOS"`,
                'accept-encoding': 'gzip, deflate, br',
                'accept-language': 'en-US,en;q=0.9',
            }
        });

        if (response && response.statusCode === 200) {
            const root = HTMLParser.parse(response.body);

            // Availability — empty value means out of stock
            const availabilityDiv = root.querySelector('#offerListingID')?.getAttribute('value');

            // SKU
            const sku = root.querySelector('#ASIN')?.getAttribute('value');

            // Product image and name
            const productImage = root.querySelector('#landingImage')?.getAttribute('src');
            const titleElement = root.querySelector('#productTitle');  // fixed: was '#title'
            const productName = titleElement?.firstChild?.text?.trim()
                             || titleElement?.querySelector('span')?.innerText
                             || 'Product Name Not Found';

            console.log('Product:', productName, '| SKU:', sku, '| Available:', availabilityDiv !== '');

            if (availabilityDiv === '') {
                console.log(productName + ': OUT OF STOCK');
            } else {
                const price = root.querySelector('.a-price .a-offscreen')?.innerText;
                const savings = root.querySelector('.savingPriceOverride.savingsPercentage')?.innerText;

                const currentTime = Date.now();
                const lastTime = lastNotificationTimes[productLink] || 0;

                if (currentTime - lastTime >= notificationCooldown) {
                    const hook = new Webhook(DISCORD_WEBHOOK_URL);
                    const embed = new MessageBuilder()
                        .setAuthor('Amazon Monitor', 'https://upload.wikimedia.org/wikipedia/commons/d/de/Amazon_icon.png')
                        .setColor('#90ee90')
                        .setTimestamp()
                        .setThumbnail(productImage)
                        .addField(productName, productLink, true)
                        .addField('Availability', 'IN STOCK', false)
                        .addField('SKU', sku || 'SKU Not Found', true)
                        .addField('Price', price || 'N/A')
                        .addField('Saving Percentage', savings || 'N/A');

                    await hook.send(embed);
                    lastNotificationTimes[productLink] = currentTime;
                    console.log(productName + ': IN STOCK — notification sent');
                } else {
                    console.log(productName + ': IN STOCK (cooldown active)');
                }
            }
        } else {
            console.log('Invalid response for:', productLink);
        }
    } catch (error) {
        console.error('Error while scraping', productLink, ':', error.message);
    }

    await new Promise(r => setTimeout(r, 8000));
    await Monitor(productLink);  // fixed: await the recursive call
}

async function Run() {
    const input = prompt("Enter links to monitor (separated by commas): ");
    const productLinksArr = input.split(',').map(link => link.trim()).filter(Boolean);

    console.log(`Now monitoring ${productLinksArr.length} items`);

    // Each link runs its own independent loop in parallel
    await Promise.allSettled(productLinksArr.map(link => Monitor(link)));
}

Run();
