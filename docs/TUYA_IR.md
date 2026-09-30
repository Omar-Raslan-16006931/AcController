# Using a Tuya / Smart Life WiFi IR blaster

The Pi's bare IR LED only reaches about a metre. A Tuya "universal IR remote"
puck reaches about 8 m. With `IR_BACKEND=tuya`, the Pi keeps running
everything (website, schedules, state), but every IR send and every learn
session goes through the puck over your local WiFi:

- Carrier remote controls
- Auto-detect brute force and bundled brand buttons
- Learned buttons (sending **and** learning, using the puck's own receiver)

No Tuya cloud call happens when a button is pressed; it's local LAN control
via [tinytuya](https://github.com/jasonacox/tinytuya). The cloud is only
needed once, to read the puck's local key.

The puck and the Pi must be on the **same WiFi network**.

## 1. Add the puck in Smart Life

Install **Smart Life** (or Tuya Smart), add the IR remote on a **2.4 GHz**
network, and make sure it works from the app once.

## 2. Get the device id and local key (one time, ~15 min)

1. Go to <https://iot.tuya.com>, create a free account.
2. **Cloud → Development → Create Cloud Project**. Industry: Smart Home.
   Development method: Smart Home. Data center: the one that matches your
   Smart Life account's region (when unsure, try Central Europe).
3. In the project: **Devices → Link App Account → Add App Account**. In the
   Smart Life app, go to **Me**, tap the scan icon, and scan the QR code.
   The puck now appears in the project's device list.
4. Note the **Access ID** and **Access Secret** on the project's Overview tab.
5. On the Pi:

   ```bash
   cd ~/AcController/backend
   .venv/bin/pip install tinytuya
   .venv/bin/python -m tinytuya wizard
   ```

   Enter the Access ID, Access Secret, any device id from the list, and your
   region. Answer yes to polling. It writes `devices.json` listing each
   device's `id`, `key`, `ip` and `version`.

The local key stays valid until you remove and re-add the puck in the app.
If you ever re-pair it, run the wizard again.

## 3. Configure the backend

In `~/AcController/backend/.env`:

```
IR_BACKEND=tuya
TUYA_DEVICE_ID=<id from devices.json>
TUYA_LOCAL_KEY=<key from devices.json>
TUYA_IP=<ip from devices.json, or Auto>
TUYA_VERSION=<version from devices.json, usually 3.3>
```

Then:

```bash
sudo systemctl restart ac-controller
```

Tip: give the puck a fixed IP (DHCP reservation) on your router. `TUYA_IP=Auto`
works too, but scanning adds a delay to the first send.

## 4. Test it

```bash
cd ~/AcController/backend
.venv/bin/python -c "from app.services import tuya_ir; tuya_ir.send_text(open('app/services/raw/ac_codes/base.txt').read()); print('sent')"
```

The puck's LED blinks and a Carrier AC should beep. For a different AC, use
Detect AC → Learn manually in the app: point the real remote at the puck and
press the button. The capture is saved exactly like a Pi-learned button.

To go back to the Pi's own LED: `IR_BACKEND=gpio` and restart.

## Troubleshooting

- `Couldn't connect`: wrong IP/version, or the puck is on another network.
  Run `.venv/bin/python -m tinytuya scan` on the Pi to see what it finds.
- `Error: Check device key or version`: the local key or version is wrong.
  Re-run the wizard and copy them again.
- Sends succeed but the AC ignores them: aim the puck at the AC; for a
  non-Carrier AC, learn its buttons through the puck instead of relying on
  the bundled codes.
