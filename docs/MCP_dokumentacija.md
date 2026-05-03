# MCP Dokumentacija

> **MCP (Model Context Protocol)** je open-source protokol koji standardizuje komunikaciju izmedju AI modela i eksternih sistema kao sto su baze podataka, API-ji i aplikacije.
> Objavljen od strane **Anthropic-a** u **novembru 2024. godine**.

---

## Sadrzaj

1. [Sta je MCP?](#sta-je-mcp)
2. [Problem koji MCP resava](#problem-koji-mcp-resava)
3. [Kako MCP funkcionise?](#kako-mcp-funkcionise)
4. [Primeri pozivanja alata](#primeri-pozivanja-alata)
5. [Koriscenje u kodu (.NET)](#koriscenje-u-kodu-net)
6. [Nasa arhitektura](#nasa-arhitektura)

---

## Sta je MCP?

MCP menja nacin na koji koristimo API-je, RPA (robotsku automatizaciju procesa), kao i same aplikacije i nacin na koji radimo.

> Bas kao sto **HTTP** predstavlja dogovorena pravila koja omogucavaju funkcionisanje interneta, **MCP postavlja pravila za doba AI agenata.**

### Tri komponente MCP-a

MCP se sastoji iz tri dela:

| Slovo | Pojam | Opis |
|-------|-------|------|
| **M** | **Model** | AI modeli koji pokrecu agente |
| **C** | **Context** | Podaci, aplikacije i alati koji su AI agentu dostupni bez potrebe za prilagodjenim integracijama |
| **P** | **Protocol** | Zamisljenj kao "univerzalni USB" — plug-and-play sistem za AI agente |

---

## Problem koji MCP resava

Pre nastanka MCP-a, programeri su morali da pisu poseban, prilagodjen kod za svaki alat koji AI treba da koristi:

- poseban kod za LinkedIn
- poseban kod za Gmail
- poseban kod za WhatsApp
- ... i tako za svaki servis posebno

Hiljade programera su radile istu stvar iznova i iznova. **MCP uvodi zajednicki standard** kako niko ne bi morao da pravi alate ispocetka.

---

## Kako MCP funkcionise?

MCP deluje kao posrednik kroz standardizovan proces:

```
Korisnik
   |
   v
AI Model (npr. Claude)
   |  poziva
   v
MCP Klijent (unutar aplikacije -- Claude Desktop, Cursor, itd.)
   |  povezuje se sa
   v
MCP Serveri (koje su napravili programeri)
   |  izvrsava
   v
Alati / Baza podataka / API
   |  vraca rezultat
   v
AI formulise odgovor na prirodnom jeziku
```

### Primer toka izvrsavanja

```
AI pita: "Koje rute nisu strme?"
         |
         v
MCP prepoznaje: treba pozvati tool -> getRoutesByDifficulty
         |
         v
Tool izvrsava SQL upit nad bazom
         |
         v
Vraca rezultat AI-u u JSON formatu
         |
         v
AI formulise odgovor na prirodnom jeziku
```

---

## Primeri pozivanja alata

| Upit korisnika | MCP tool koji se poziva | Sta se desava |
|----------------|------------------------|----------------|
| "Koje rute postoje za pocetnike?" | `get_rute_po_tezini(tezina: "laka")` | SQL upit, vraca JSON |
| "Sta ima da se vidi blizu mene?" | `get_atrakcije_u_radijusu(lat, lng, 5km)` | PostGIS upit |
| "Rezervisi mi sobu u subotu" | `bukiraj_smestaj(...)` | Upisuje u bazu |
| "Preporuci mi rutu za porodicu" | `get_recommended_rute(tip: "porodicna")` | Poziva recommendation sistem |
| "Koji restorani rade veceras?" | `get_restorani_po_radnom_vremenu(dan: "subota")` | Filtriranje po vremenu |

### Promptovi (unapred definisani obrasci)

Prompt koristi unapred definisane obrasce za cesta pitanja. Na primer, ukoliko nekog zanima ruta za porodicu sa decom, postoji vec unapred definisan prompt koji zna koje parametre da trazi — ne mora se svaki put opisivati isto.

---

## Koriscenje u kodu (.NET)

Za implementaciju MCP-a u **.NET** projektu koristi se **ModelContextProtocol** NuGet paket.

### Instalacija paketa

Pokrenite sledecu komandu u terminalu konkretnog projekta:

```bash
dotnet add package ModelContextProtocol
```

### Primer MCP tool-a

```csharp
[McpServerTool]
public async Task<string> GetRute(string tezina)
{
    var rute = await _context.Rute
        .Where(r => r.Tezina == tezina)
        .ToListAsync();

    return JsonSerializer.Serialize(rute);
}
```

### Registracija MCP servera

```csharp
builder.Services.AddMcpServer()
    .WithTools<RouteTool>()
    .WithTools<AtrakcijeTools>()
    .WithTools<SmestajTool>();
```

---

## Nasa arhitektura

U nasoj arhitekturi korisnik putem prirodnog jezika komunicira sa Chatbot-om / AI agentom, koji iskoriscava MCP server za izvrsavanje konkretnih akcija.

```
Korisnik (prirodni jezik)
         |
         v
  Chatbot / AI Agent
         |
         v
     MCP Server
         |
   ------+---------------------------
   |         |         |            |
GetRute  GetAtrakcije  GetMape  Rezervisi
                                    |
                                    v
                       Baza podataka / Eksterni API
```

### Planirani MCP alati

| Tool | Opis |
|------|------|
| `GetRute` | Dohvata rute prema kriterijumima |
| `GetAtrakcije` | Lista turistickih atrakcija |
| `GetMape` | Geografske mape i lokacije |
| `Rezervisi` | Kreiranje rezervacija u bazi |
| `GetPreporuke` | AI-bazirani sistem preporuka |

---

## Dodatne napomene

- MCP je **open-source** — dostupan za doprinos i prilagodjavanje
- Dizajniran da bude **language-agnostic** — podrzava razlicite programske jezike
- Omogucava **visestruke konekcije** — jedan AI agent moze koristiti vise MCP servera istovremeno
- Idealan za **turisticki projekat** — kombinacija geografskih podataka, rezervacija i preporuka

---

## Korisni resursi

| Resurs | URL |
|--------|-----|
| Anthropic MCP Dokumentacija | https://modelcontextprotocol.io |
| ModelContextProtocol NuGet | https://www.nuget.org/packages/ModelContextProtocol |
| GitHub — MCP Specifikacija | https://github.com/modelcontextprotocol |

---

*© 2024 Interna Dokumentacija*
