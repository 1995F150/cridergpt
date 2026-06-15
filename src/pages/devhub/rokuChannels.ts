// Pre-made CriderGPT-branded Roku channels.
// Each channel is a complete BrightScript + SceneGraph project ready to zip
// and sideload. Replace TODO files (logo/poster art) and you're shippable.

export type RokuFile = { path: string; content: string };
export type RokuChannel = {
  id: string;
  name: string;
  pitch: string;
  category: string;
  monetization: string;
  files: RokuFile[];
};

const sharedManifest = (title: string, description: string) => `title=${title}
subtitle=Powered by CriderGPT
major_version=1
minor_version=0
build_version=00001
mm_icon_focus_hd=pkg:/images/icon_focus_hd.png
mm_icon_focus_sd=pkg:/images/icon_focus_sd.png
splash_screen_hd=pkg:/images/splash_hd.png
splash_screen_sd=pkg:/images/splash_sd.png
splash_color=#0F1115
splash_min_time=1500
ui_resolutions=hd
bs_const=DEBUG=false
`;

const mainBrs = `sub Main()
    showChannelSGScreen()
end sub

sub showChannelSGScreen()
    screen = CreateObject("roSGScreen")
    m.port = CreateObject("roMessagePort")
    screen.setMessagePort(m.port)
    scene = screen.CreateScene("MainScene")
    screen.show()
    while true
        msg = wait(0, m.port)
        msgType = type(msg)
        if msgType = "roSGScreenEvent"
            if msg.isScreenClosed() then return
        end if
    end while
end sub
`;

const sceneXml = (title: string, body: string) => `<?xml version="1.0" encoding="utf-8" ?>
<component name="MainScene" extends="Scene">
  <script type="text/brightscript" uri="pkg:/components/MainScene.brs" />
  <children>
    <Rectangle width="1920" height="1080" color="0x0F1115FF" />
    <Label id="brand" text="CriderGPT" font="font:MediumBoldSystemFont" color="0x1F8B4C"
           translation="[64, 48]" />
    <Label id="title" text="${title}" font="font:LargeBoldSystemFont" color="0xE8E8EAFF"
           translation="[64, 120]" />
${body}
  </children>
</component>
`;

const sceneBrs = `sub init()
    m.top.setFocus(true)
end sub
`;

const buildShared = (folderTitle: string, channelTitle: string, channelDesc: string, sceneBody: string, sceneInit?: string) => [
  { path: "manifest", content: sharedManifest(channelTitle, channelDesc) },
  { path: "source/Main.brs", content: mainBrs },
  { path: "components/MainScene.xml", content: sceneXml(channelTitle, sceneBody) },
  { path: "components/MainScene.brs", content: sceneInit || sceneBrs },
  { path: "images/icon_focus_hd.png.TODO", content: "Replace with 290x218 icon. Use CriderGPT logo." },
  { path: "images/icon_focus_sd.png.TODO", content: "Replace with 246x140 icon." },
  { path: "images/splash_hd.png.TODO", content: "Replace with 1280x720 splash." },
  { path: "images/splash_sd.png.TODO", content: "Replace with 720x480 splash." },
  { path: "README.md", content: `# ${channelTitle}\n\n${channelDesc}\n\n## Sideload\n1. Enable Dev Mode on Roku: Home x3, Up x2, Right, Left, Right, Left, Right.\n2. Browse to http://<roku-ip>/ and install this zip.\n\n## Folders\n- manifest (root, no extension)\n- source/ - BrightScript entry\n- components/ - SceneGraph XML + BRS\n- images/ - icons and splash (replace the .TODO files)\n` },
];

// 1. CriderGPT Hub - companion to the web app
const criderGptHub: RokuChannel = {
  id: "cridergpt-hub",
  name: "CriderGPT Hub",
  pitch: "Big-screen companion: livestock counts, today's tasks, latest tips.",
  category: "Utility",
  monetization: "Free (drives web/app signups)",
  files: buildShared("cridergpt-hub", "CriderGPT Hub", "Big-screen companion dashboard.",
    `    <Label id="row1" text="Sign in at cridergpt.com to link your TV." font="font:MediumSystemFont"
           color="0x8B94A7FF" translation="[64, 240]" />
    <Label id="row2" text="Once linked, this screen shows your herd, tasks, and tips." font="font:SmallSystemFont"
           color="0x8B94A7FF" translation="[64, 300]" />`),
};

// 2. FFA Show Watch - video grid
const ffaShowWatch: RokuChannel = {
  id: "ffa-show-watch",
  name: "FFA Show Watch",
  pitch: "Livestock auctions, fair coverage, and FFA event replays.",
  category: "FFA",
  monetization: "Free + Roku Pay $2.99/mo archives",
  files: buildShared("ffa-show-watch", "FFA Show Watch", "Livestock shows and FFA event replays.",
    `    <RowList id="grid" translation="[64, 200]" itemSize="[1792, 280]" rowHeights="[260]"
             showRowLabel="[true]" rowLabelOffset="[[0,0]]" />`,
    `sub init()
    m.grid = m.top.findNode("grid")
    content = createObject("roSGNode", "ContentNode")
    row = content.createChild("ContentNode")
    row.title = "Latest shows"
    for i = 0 to 5
        item = row.createChild("ContentNode")
        item.title = "Episode " + i.toStr()
        item.hdPosterUrl = "https://cridergpt.com/poster.jpg"
    end for
    m.grid.content = content
    m.grid.setFocus(true)
end sub
`),
};

// 3. Recipe Reader - text reader
const recipeReader: RokuChannel = {
  id: "recipe-reader",
  name: "Recipe Reader",
  pitch: "Big-screen recipe display synced with your CriderGPT recipe vault.",
  category: "Utility",
  monetization: "Free (drives CriderGPT signups)",
  files: buildShared("recipe-reader", "Recipe Reader", "TV-friendly recipe reader.",
    `    <Label id="recipeName" text="Granny's Cornbread" font="font:LargeBoldSystemFont"
           color="0xE8E8EAFF" translation="[64, 220]" />
    <Label id="body" text="1. Preheat 425F.&#10;2. Mix cornmeal, flour, salt.&#10;3. Add buttermilk and egg.&#10;4. Pour into hot greased skillet.&#10;5. Bake 20 minutes." wrap="true"
           width="1700" font="font:MediumSystemFont" color="0xCFD5E3FF" translation="[64, 320]" />`),
};

// 4. RDR2 Lore Channel
const rdr2Lore: RokuChannel = {
  id: "rdr2-lore",
  name: "RDR2 Lore Channel",
  pitch: "Loops your RDR2 gamer-guide content as a video channel.",
  category: "Gaming",
  monetization: "Free + tip jar",
  files: buildShared("rdr2-lore", "RDR2 Lore Channel", "Red Dead Redemption 2 lore and walkthroughs.",
    `    <Label id="hint" text="Press OK to start the loop." font="font:MediumSystemFont"
           color="0x8B94A7FF" translation="[64, 240]" />
    <Video id="player" width="1792" height="700" translation="[64, 320]" />`,
    `sub init()
    m.player = m.top.findNode("player")
    content = createObject("roSGNode", "ContentNode")
    content.url = "https://cridergpt.com/rdr2-loop.mp4"
    content.streamFormat = "mp4"
    m.player.content = content
    m.player.control = "play"
    m.player.setFocus(true)
end sub
`),
};

// 5. Weather Watcher
const weatherWatcher: RokuChannel = {
  id: "weather-watcher",
  name: "Weather Watcher",
  pitch: "Hyperlocal weather with radar, 7-day forecast, frost alerts.",
  category: "Weather",
  monetization: "Free + Roku Ads",
  files: buildShared("weather-watcher", "CriderGPT Weather Watcher", "Hyperlocal farm weather.",
    `    <Label id="loc" text="Your farm: Mechanicsburg, VA" font="font:MediumBoldSystemFont"
           color="0xE8E8EAFF" translation="[64, 220]" />
    <Label id="temp" text="68 F - Mostly clear" font="font:LargeBoldSystemFont"
           color="0x1F8B4C" translation="[64, 280]" />
    <Label id="forecast" text="Tomorrow: 72/54 sunny.&#10;Wed: 70/52 showers PM.&#10;Thu: 65/48 frost warning overnight." wrap="true"
           width="1700" font="font:MediumSystemFont" color="0xCFD5E3FF" translation="[64, 380]" />`),
};

export const ROKU_CHANNELS: RokuChannel[] = [
  criderGptHub,
  ffaShowWatch,
  recipeReader,
  rdr2Lore,
  weatherWatcher,
];
