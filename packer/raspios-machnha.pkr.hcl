# Builds a Raspberry Pi OS Lite (64-bit) image with MachNha preinstalled.
# Requires: Linux x86-64 host with root, qemu-user-static + binfmt, kpartx; Packer >= 1.9.
#   packer init packer/ && sudo packer build -var "bundle_dir=dist/machnha-pi" packer/
packer {
  required_plugins {
    arm-image = {
      source  = "github.com/solo-io/arm-image"
      version = ">= 0.2.7"
    }
  }
}

variable "bundle_dir" {
  type        = string
  description = "Directory produced by `npm run package:pi` (dist/machnha-pi)"
  default     = "dist/machnha-pi"
}

variable "raspios_url" {
  type    = string
  default = "https://downloads.raspberrypi.com/raspios_lite_arm64/images/raspios_lite_arm64-2024-11-19/2024-11-19-raspios-bookworm-arm64-lite.img.xz"
}

variable "raspios_checksum" {
  type        = string
  description = "sha256 of the .img.xz; `file:<url>.sha256` lets Packer fetch it"
  default     = "file:https://downloads.raspberrypi.com/raspios_lite_arm64/images/raspios_lite_arm64-2024-11-19/2024-11-19-raspios-bookworm-arm64-lite.img.xz.sha256"
}

variable "node_version" {
  type    = string
  default = "22.20.0"
}

variable "install_caddy" {
  type    = bool
  default = false
}

source "arm-image" "raspios" {
  iso_url           = var.raspios_url
  iso_checksum      = var.raspios_checksum
  image_type        = "raspberrypi"
  target_image_size = 4294967296 # 4 GiB; Pi expands the rootfs on first boot
  output_filename   = "packer/output/machnha-pi.img"
  qemu_binary       = "qemu-aarch64-static"
}

build {
  sources = ["source.arm-image.raspios"]

  provisioner "file" {
    source      = "${var.bundle_dir}/"
    destination = "/opt/machnha-bundle"
  }

  provisioner "shell" {
    environment_vars = [
      "NODE_VERSION=${var.node_version}",
      "INSTALL_CADDY=${var.install_caddy}",
    ]
    script = "packer/provision.sh"
  }
}
