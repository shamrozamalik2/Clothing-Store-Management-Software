<#
  Sends raw bytes (ESC/POS) directly to a Windows-installed printer queue,
  bypassing the driver's normal document formatting.

  This is the standard Win32 spooler technique for raw/POS printing on
  Windows (OpenPrinter / StartDocPrinter with datatype "RAW" / WritePrinter),
  used because most USB (and many Bluetooth-paired) thermal printers install
  themselves as a normal Windows printer queue, and the OS driver already
  owns the USB interface — so going around the spooler (e.g. via raw
  libusb/WebUSB) is not reliable, but writing RAW bytes through the spooler
  the printer's own driver already claims is.

  Usage: powershell -ExecutionPolicy Bypass -File win-raw-print.ps1 -PrinterName "POS-80" -DataFile "C:\...\job.bin"
  Prints "OK" and exits 0 on success; prints an error and exits 1 on failure.
#>

param(
    [Parameter(Mandatory = $true)][string]$PrinterName,
    [Parameter(Mandatory = $true)][string]$DataFile
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $DataFile)) {
    Write-Error "Data file not found: $DataFile"
    exit 1
}

Add-Type -Language CSharp -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class PbcRawPrinter
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA
    {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);

    public static int LastError;

    public static bool SendBytes(string printerName, byte[] bytes)
    {
        IntPtr hPrinter;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "PBC Receipt";
        di.pDataType = "RAW";

        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) { LastError = Marshal.GetLastWin32Error(); return false; }
        try
        {
            if (!StartDocPrinter(hPrinter, 1, di)) { LastError = Marshal.GetLastWin32Error(); return false; }
            try
            {
                if (!StartPagePrinter(hPrinter)) { LastError = Marshal.GetLastWin32Error(); return false; }
                try
                {
                    int written;
                    bool ok = WritePrinter(hPrinter, bytes, bytes.Length, out written);
                    if (!ok || written != bytes.Length) { LastError = Marshal.GetLastWin32Error(); return false; }
                    return true;
                }
                finally { EndPagePrinter(hPrinter); }
            }
            finally { EndDocPrinter(hPrinter); }
        }
        finally { ClosePrinter(hPrinter); }
    }
}
"@

try {
    $bytes = [System.IO.File]::ReadAllBytes($DataFile)
    $ok = [PbcRawPrinter]::SendBytes($PrinterName, $bytes)
    if ($ok) {
        Write-Output "OK"
        exit 0
    } else {
        Write-Error "WritePrinter failed (Win32 error $([PbcRawPrinter]::LastError)) for printer '$PrinterName'."
        exit 1
    }
} catch {
    Write-Error "Raw print failed: $($_.Exception.Message)"
    exit 1
}
