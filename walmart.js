import got from "got";
import HTMLParser from "node-html-parser";
import promptSync from "prompt-sync";
const prompt = promptSync();

import { Webhook, MessageBuilder } from "discord-webhook-node";

// Set WALMART_WEBHOOK_URL in your .env file — never hardcode tokens
const DISCORD_WEBHOOK_URL = process.env.WALMART_WEBHOOK_URL;
if (!DISCORD_WEBHOOK_URL) throw new Error('Missing env var: WALMART_WEBHOOK_URL');

const notificationCooldown = 3600 * 1000; // 1 hour
const lastNotificationTimes = {};

// https://www.walmart.com/ip/SAMSUNG-65-Class-4K-Crystal-UHD-2160P-LED-Smart-TV-with-HDR-UN65TU7000/933852540
async function Monitors(product) {
    try {
        const responses = await got(product, {
            headers: {
                'connection': 'keep-alive',
                'sec-ch-ua': `"Not;A Brand";v="99", "Google Chrome";v="97", "Chromium";v="97"`,
                'sec-ch-ua-mobile': '?0',
                'upgrade-insecure-requests': 1,
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36',
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'sec-fetch-site': 'same-origin',
                'sec-fetch-mode': 'navigate',  // fixed: was 'navcorsigate'
                'sec-fetch-user': '?1',
                'sec-fetch-dest': 'document',
                'accept-encoding': 'gzip, deflate, br',
                'accept-language': 'en-US,en;q=0.9',
            }
        });

        if (responses && responses.statusCode === 200) {
            const roots = HTMLParser.parse(responses.body);

            // Product name — try multiple selectors for resilience
            const productFullName = roots.querySelector('h1[itemprop="name"]')?.textContent?.trim()
                                 || roots.querySelector('#__next h1')?.textContent?.trim()
                                 || 'Unknown Product';

            // Product image — try data-automation-id first, fall back to first img in main
            const productImage = roots.querySelector('[data-automation-id="product-image"] img')?.getAttribute('src')
                              || roots.querySelector('#__next main img')?.getAttribute('src')
                              || '';

            // Price — itemprop is most stable across Walmart page layouts
            const price = roots.querySelector('[itemprop="price"]')?.getAttribute('content')
                       || roots.querySelector('[data-automation-id="product-price"] span')?.textContent?.trim()
                       || 'Price not available';

            // Availability — check add-to-cart button aria-label
            const addToCartBtn = roots.querySelector('button[data-automation-id="add-to-cart-btn"]')
                              || roots.querySelector('button[aria-label]');
            const ariaLabel = addToCartBtn?.getAttribute('aria-label') || '';
            const isInStock = ariaLabel.toLowerCase().includes('add to cart');

            console.log(`${productFullName}: ${isInStock ? 'IN STOCK' : 'OUT OF STOCK'} | aria-label: "${ariaLabel}"`);

            if (isInStock) {
                const currentTime = Date.now();
                const lastTime = lastNotificationTimes[product] || 0;

                if (currentTime - lastTime >= notificationCooldown) {
                    const hook = new Webhook(DISCORD_WEBHOOK_URL);
                    const embed = new MessageBuilder()
                        .setAuthor('Walmart Monitor', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Walmart_Spark.svg/1925px-Walmart_Spark.svg.png')
                        .setColor('#90ee90')  // fixed: was '$90ee90'
                        .setTimestamp()
                        .setThumbnail(productImage)
                        .addField(productFullName, product, true)
                        .addField('Availability', 'In Stock', false)
                        .addField('Price', price);

                    await hook.send(embed);  // fixed: was not awaited
                    lastNotificationTimes[product] = currentTime;
                    console.log(productFullName + ': IN STOCK — notification sent');
                } else {
                    console.log(productFullName + ': IN STOCK (cooldown active)');
                }
            }
        } else {
            console.log('Invalid response for:', product);
        }
    } catch (error) {
        console.error('Error while scraping', product, ':', error.message);
    }

    await new Promise(r => setTimeout(r, 8000));
    await Monitors(product);  // fixed: await the recursive call
}

async function Run() {
    const input = prompt("Enter links to monitor (separated by commas): ");
    const productLinksArr = input.split(',').map(link => link.trim()).filter(Boolean);

    console.log(`Now monitoring ${productLinksArr.length} items`);
    await Promise.allSettled(productLinksArr.map(link => Monitors(link)));
}

Run();