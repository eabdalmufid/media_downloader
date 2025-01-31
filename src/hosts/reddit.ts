import axios, {AxiosResponse} from 'axios';

interface RedditPost {
    data: {
        is_gallery?: boolean;
        gallery_data?: {
            items: Array<{media_id: string}>;
        };
        is_video?: boolean;
        media?: {
            reddit_video?: {
                fallback_url: string;
            };
        };
        secure_media?: {
            oembed?: {
                thumbnail_url: string;
            };
        };
        url?: string;
    };
}

interface RedditApiResponse {
    data: {
        children: RedditPost[];
    };
}

interface UrlResult {
    urls: string[];
    count: number;
}

/**
 * Extracts direct media URLs from Reddit posts and comments.
 * Supports various content types including images, videos, galleries, and external links.
 * Utilizes Reddit's JSON API to fetch post data.
 *
 * @testCases
 * single image: https://www.reddit.com/r/unixporn/comments/12ruaq1/xperia_10_iii_w_sailfish_w_arch_my_mobile_office/
 * gallery: https://www.reddit.com/r/cats/comments/1dsdwbc/_/
 * native video: https://www.reddit.com/r/blackmagicfuckery/comments/12sex2d/pool_black_magic/
 * native video: https://www.reddit.com/r/interestingasfuck/comments/1drzauu/the_chinese_tianlong3_rocket_accidentally/
 * youtube thumbnail: https://www.reddit.com/r/neverchangejapan/comments/12spx82/ningen_isu_ringo_no_namida_a_metal_song_about_an/
 */
class RedditDownloader {
    constructor() {}

    async getDirectUrlsAndCount(redditUrl: string): Promise<UrlResult> {
        try {
            const urls = await this.getMediaInfo(redditUrl);
            return {
                urls: urls,
                count: urls.length,
            };
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to process URL: ${error.message}`);
            } else {
                throw new Error('An unknown error occurred');
            }
        }
    }

    private async getMediaInfo(redditUrl: string): Promise<string[]> {
        const url = redditUrl.endsWith('.json') ? redditUrl : `${redditUrl}.json`;

        try {
            const response: AxiosResponse<RedditApiResponse[]> = await axios.get(url);
            if (response.data?.[0]?.data?.children) {
                const posts = response.data[0].data.children;
                const mediaUrls: string[] = [];

                for (const post of posts) {
                    const urls = this.processRedditPost(post.data);
                    mediaUrls.push(...urls);
                }

                return mediaUrls;
            } else {
                throw new Error('Unexpected response structure');
            }
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Error fetching Reddit data: ${error.message}`);
            } else {
                throw new Error('An unknown error occurred while fetching Reddit data');
            }
        }
    }

    private processRedditPost(postData: RedditPost['data']): string[] {
        const mediaUrls: string[] = [];

        if (postData.is_gallery && postData.gallery_data?.items) {
            mediaUrls.push(
                ...postData.gallery_data.items.map(
                    item => `https://i.redd.it/${item.media_id}.jpg`
                )
            );
        } else if (postData.is_video && postData.media?.reddit_video?.fallback_url) {
            mediaUrls.push(postData.media.reddit_video.fallback_url);
        } else if (postData.secure_media?.oembed?.thumbnail_url) {
            mediaUrls.push(postData.secure_media.oembed.thumbnail_url);
        } else if (postData.url) {
            mediaUrls.push(postData.url);
        }

        return mediaUrls;
    }
}

export default RedditDownloader;
