# .NET Dokumentacija

> **.NET** (izgovara se *"dot net"*) je besplatna, open-source platforma za razvoj aplikacija koju je razvio Microsoft.
> Verzija dokumenta: **1.0** | Datum: Mart 2024

---

## Sadrzaj

1. [Uvod](#uvod)
2. [Preduslovi za instalaciju](#preduslovi-za-instalaciju)
3. [Preuzimanje .NET-a](#preuzimanje-net-a)
4. [Instalacija na Windows](#instalacija-na-windows)
5. [Instalacija na Linux](#instalacija-na-linux)
6. [Instalacija na macOS](#instalacija-na-macos)
7. [Verifikacija instalacije](#verifikacija-instalacije)
8. [Kreiranje i pokretanje projekta](#kreiranje-i-pokretanje-projekta)
9. [Pokretanje projekta sa Git-a](#pokretanje-projekta-sa-git-a)
10. [Resavanje cestih problema](#resavanje-cestih-problema)
11. [Deinstalacija .NET-a](#deinstalacija-net-a)
12. [Korisni resursi](#korisni-resursi)

---

## Uvod

Ova dokumentacija pokriva kompletan proces instalacije .NET okruzenja na vasem racunaru, od preduslova do verifikacije instalacije, kao i kreiranje i pokretanje .NET projekata u Visual Studio okruzenju.

**Podrzane verzije:**

| Verzija | Tip | Napomena |
|---------|-----|----------|
| .NET 8 | LTS | **Preporucena verzija** |
| .NET 7 | Trenutna | Standardna podrska |
| .NET 6 | LTS | Prethodna dugorocna verzija |

> **Napomena:** LTS (Long Term Support) verzije imaju podrsku od 3 godine. Preporucuje se koriscenje LTS verzija za produkcione sisteme.

---

## Preduslovi za instalaciju

### 2.1 Podrzani operativni sistemi

| Operativni sistem | Arhitektura | Verzija .NET | Status |
|-------------------|-------------|--------------|--------|
| Windows 11 | x64, ARM64 | .NET 6, 7, 8 | Podrzano |
| Windows 10 (1607+) | x64, x86, ARM64 | .NET 6, 7, 8 | Podrzano |
| Windows Server 2022 | x64 | .NET 6, 7, 8 | Podrzano |
| Windows Server 2019 | x64 | .NET 6, 7, 8 | Podrzano |
| Ubuntu 22.04 LTS | x64, ARM64 | .NET 6, 7, 8 | Podrzano |
| Ubuntu 20.04 LTS | x64, ARM64 | .NET 6, 7, 8 | Podrzano |
| Debian 12 | x64, ARM64 | .NET 6, 7, 8 | Podrzano |
| macOS 13 Ventura | x64, ARM64 | .NET 6, 7, 8 | Podrzano |
| macOS 12 Monterey | x64, ARM64 | .NET 6, 7, 8 | Podrzano |

### 2.2 Hardverski zahtevi

| Komponenta | Minimalni zahtev | Preporuceni zahtev |
|------------|------------------|-------------------|
| Procesor | 1 GHz, 64-bit (x64/ARM64) | 2+ GHz, vise jezgara |
| RAM memorija | 512 MB | 4 GB ili vise |
| Slobodan disk prostor | 1.5 GB (.NET Runtime) | 10 GB (SDK + alati) |
| Internet konekcija | Obavezna za preuzimanje | Brza konekcija preporucena |

### 2.3 Softverski preduslovi (Windows)

#### Windows Update

Sistem mora biti azuriran:

1. Otvorite **Podesavanja (Settings)**
2. Idite na **Windows Update**
3. Pritisnite "Proveri azuriranja"
4. Instalirajte sva dostupna azuriranja i restartujte racunar

#### Visual C++ Redistributable

Obavezno instalirajte:

- **Visual C++ 2015-2022 Redistributable (x64)** - potreban za .NET 6+
- **Visual C++ 2015-2022 Redistributable (x86)** - potreban za 32-bitne aplikacije

> **Savet:** Ako niste sigurni da li imate ove pakete, mozete ih bezbedno ponovo instalirati.

#### Administratorska prava

Za instalaciju .NET-a na nivou sistema potrebna su **administratorska prava**.

### 2.4 Preduslovi za Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y apt-transport-https wget
```

### 2.5 Preduslovi za macOS

- macOS 12.0 (Monterey) ili noviji
- Xcode Command Line Tools:

```bash
xcode-select --install
```

- Homebrew (opciono, ali preporuceno)

---

## Preuzimanje .NET-a

### 3.1 Tipovi paketa

| Tip paketa | Opis | Preporuceno za |
|------------|------|----------------|
| **.NET SDK** | Sadrzi sve sto je potrebno za razvoj, ukljucujuci Runtime | Programeri |
| **.NET Runtime** | Samo za pokretanje aplikacija, bez razvojnih alata | Produkcioni serveri |
| **ASP.NET Core Runtime** | Runtime za web aplikacije i API-je | Web serveri |

> **Napomena:** Za razvoj aplikacija uvek preuzimajte **SDK**. Runtime je dovoljan samo za masine koje ce pokretati vec razvijene aplikacije.

### 3.2 Zvanicna stranica za preuzimanje

https://dotnet.microsoft.com/download

Na stranici izaberite:

- Zeljenu verziju .NET-a (preporucuje se najnovija LTS)
- Vas operativni sistem
- Arhitekturu (x64 za vecinu savremenih racunara)
- Tip paketa (SDK za razvoj, Runtime za produkciju)

---

## Instalacija na Windows

### 4.1 Instalacija putem instalatera (.exe)

1. Preuzmite `.exe` instaler sa zvanicne stranice
2. Desni klik na preuzetu datoteku i izaberite "Pokreni kao administrator"
3. Pratite uputstva u carobnjaku za instalaciju
4. Prihvatite licencne uslove
5. Izaberite tip instalacije (preporucena je **Standardna**)
6. Sacekajte da se instalacija zavrsi
7. Restartujte racunar kada se to od vas zatrazi

### 4.2 Instalacija putem winget (Windows Package Manager)

Otvorite **PowerShell** ili **Command Prompt** kao administrator:

```powershell
# Instalacija SDK-a
winget install Microsoft.DotNet.SDK.8

# Instalacija samo Runtime-a
winget install Microsoft.DotNet.Runtime.8
```

### 4.3 Instalacija putem PowerShell skripte

```powershell
Invoke-WebRequest https://dot.net/v1/dotnet-install.ps1 -OutFile dotnet-install.ps1
Set-ExecutionPolicy Unrestricted -Scope Process
.\dotnet-install.ps1 -Channel 8.0 -Runtime dotnet
```

> **Savet:** PowerShell skripta je idealna za automatizovanu instalaciju na vise masina ili u CI/CD okruzenjima.

---

## Instalacija na Linux

### 5.1 Ubuntu / Debian

#### Dodavanje Microsoft repozitorijuma

```bash
wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
rm packages-microsoft-prod.deb
```

#### Instalacija .NET SDK

```bash
sudo apt update
sudo apt install -y dotnet-sdk-8.0
```

#### Instalacija samo Runtime-a

```bash
sudo apt install -y aspnetcore-runtime-8.0
```

### 5.2 Red Hat / Fedora / CentOS

```bash
sudo dnf install dotnet-sdk-8.0
```

### 5.3 Instalacija putem skripte (sve distribucije)

```bash
wget https://dot.net/v1/dotnet-install.sh
chmod +x dotnet-install.sh
./dotnet-install.sh --channel 8.0
```

Dodajte .NET u PATH (u `~/.bashrc` ili `~/.profile`):

```bash
export DOTNET_ROOT=$HOME/.dotnet
export PATH=$PATH:$HOME/.dotnet:$HOME/.dotnet/tools
```

---

## Instalacija na macOS

### 6.1 Instalacija putem PKG instalatera

1. Preuzmite `.pkg` instaler sa https://dotnet.microsoft.com/download
2. Dvaput kliknite na preuzetu datoteku
3. Pratite uputstva instalacionog carobnjaka
4. Unesite admin lozinku kada se to zatrazi
5. Sacekajte da se instalacija zavrsi

### 6.2 Instalacija putem Homebrew

```bash
# Instalirajte Homebrew ako ga nemate
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Instalirajte .NET
brew install dotnet

# Ili specificnu verziju
brew install dotnet@8
```

---

## Verifikacija instalacije

### 7.1 Provera verzije

```bash
dotnet --version
```

Ocekivani izlaz (primer za .NET 8):

```
8.0.100
```

### 7.2 Provera svih instaliranih verzija

```bash
dotnet --list-sdks
dotnet --list-runtimes
```

### 7.3 Kreiranje testnog projekta

```bash
dotnet new console -o HelloWorld
cd HelloWorld
dotnet run
```

Ocekivani izlaz:

```
Hello, World!
```

> Ako vidite `Hello, World!` u terminalu, instalacija je uspesno zavrsena i .NET je spreman za koriscenje.

---

## Kreiranje i pokretanje projekta

Nakon instalacije .NET SDK-a i Visual Studio okruzenja moguce je razvijati i pokretati .NET aplikacije.

### Pokretanje Visual Studio

Pokrenite Visual Studio i na pocetnom ekranu izaberite opciju **"Create a new project"**.

### Izbor tipa projekta

1. Izaberite tip projekta: **Console App**
2. Kliknite **Next**

### Podesavanje projekta

Unesite osnovne informacije:

- **Project name** - naziv projekta
- **Location** - lokacija gde ce projekat biti sacuvan

Kliknite **Next**.

### Izbor .NET verzije

Izaberite verziju .NET platforme i kliknite **Create**.

### Tipicna struktura .NET projekta

```
MojProjekat/
├── MojProjekat.sln
├── MojProjekat/
│   ├── MojProjekat.csproj
│   ├── Program.cs
│   └── ...
```

### Pokretanje projekta

Projekat se pokrace na jedan od sledecih nacina:

- Klikom na dugme **Start** ili **Start Debugging**
- Precnicom na tastaturi: **F5**

---

## Pokretanje projekta sa Git-a

### Kloniranje repozitorijuma

1. Otvorite Visual Studio
2. Izaberite opciju **"Clone a repository"**
3. U polje **Repository location** unesite URL repozitorijuma sa GitLab-a
4. Izaberite **lokaciju na racunaru** gde ce projekat biti sacuvan
5. Kliknite **Clone**

### Otvaranje projekta

Nakon kloniranja automatski se otvara repozitorijum koji je kloniran sa GitLaba, spreman za rad.

---

## Resavanje cestih problema

| Problem | Moguc uzrok | Resenje |
|---------|-------------|---------|
| `dotnet` nije prepoznata komanda | PATH nije podesena | Restartujte terminal ili dodajte .NET u PATH |
| Greska pri instalaciji na Windows | Nedostaju admin prava | Pokrenite instaler kao administrator |
| SSL greska pri preuzimanju paketa | Zastareli sertifikati | Azurirajte sistem i sertifikate |
| Konflikti verzija | Vise verzija instalirano | Koristite `global.json` za odredjivanje verzije |
| Greska `GLIBC_2.xx not found` na Linux | Stara verzija libc | Azurirajte operativni sistem |
| Instalacija ne napreduje | Spor internet ili pozadinski procesi | Proverite konekciju, zatvorite AV softver |

### Lokacije logova instalacije

- **Windows:** `%TEMP%\dotnet_install_*.log`
- **Linux/macOS:** `~/dotnet-install.log`

---

## Deinstalacija .NET-a

### Windows

1. Otvorite **Podesavanja > Aplikacije > Instalirane aplikacije**
2. Potrazite "Microsoft .NET" u listi aplikacija
3. Kliknite na `...` i izaberite **Deinstaliraj**
4. Ponovite za sve .NET verzije koje zelite da uklonite

### Linux

```bash
sudo apt remove dotnet-sdk-8.0
sudo apt autoremove
```

### macOS

```bash
sudo rm -rf /usr/local/share/dotnet
sudo rm /etc/paths.d/dotnet
```

---

## Korisni resursi

| Resurs | URL |
|--------|-----|
| Zvanicna stranica | https://dotnet.microsoft.com |
| Microsoft Docs | https://docs.microsoft.com/dotnet |
| .NET Blog | https://devblogs.microsoft.com/dotnet |
| GitHub | https://github.com/dotnet |
| NuGet Gallery | https://www.nuget.org |
| Stack Overflow | https://stackoverflow.com/questions/tagged/.net |

---

*© 2024 Interna Dokumentacija — Verzija 1.0*
