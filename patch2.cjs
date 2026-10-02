const fs = require('fs');

let content = fs.readFileSync('src/routes/admin.tsx', 'utf-8');

const targetStr = `  const [open, setOpen] = useState(false);
  const [nama, setNama] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("150");
  const [busy, setBusy] = useState(false);`;

const replacement = `  const [open, setOpen] = useState(false);
  const [nama, setNama] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("150");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && !latitude && !longitude) {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLatitude(String(pos.coords.latitude));
            setLongitude(String(pos.coords.longitude));
          },
          (err) => {
            console.warn("Geolocation error", err);
          }
        );
      }
    }
  }, [open, latitude, longitude]);`;

// we only want to replace the first occurrence (in TambahKantor)
const firstIdx = content.indexOf('function TambahKantor');
if (firstIdx !== -1) {
    const after = content.substring(firstIdx);
    const replacedAfter = after.replace(targetStr, replacement).replace(targetStr.replace(/\n/g, '\r\n'), replacement);
    content = content.substring(0, firstIdx) + replacedAfter;
}

fs.writeFileSync('src/routes/admin.tsx', content, 'utf-8');
console.log('Patched admin.tsx successfully');
