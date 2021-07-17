{
  pkgs ? import (fetchTarball {
    url = https://releases.nixos.org/nixos/21.05/nixos-21.05.1510.a165aeceda9/nixexprs.tar.xz;
    sha256 = "124s05b0xk97arw0vvq8b4wcvsw6024dfdzwcx9qjxf3a2zszmam";
  }) {}
}:
  with pkgs;
  stdenv.mkDerivation rec {
    name = "bot-${version}";
    version = "0.2.0";
    src = ./.;
    phases = [ "unpackPhase" "buildPhase" "installPhase" ];
    buildInputs = [ nodejs-14_x ];
    buildPhase = ''
      export HOME="."
      npm i
    '';
    installPhase = ''
      mkdir -p $out/
      cp -r . $out/
      cp -r * $out/
    '';
  }
