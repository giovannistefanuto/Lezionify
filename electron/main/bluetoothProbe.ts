// Win32 reports actual classic Bluetooth connection state, not PnP presence or pairing.
// No inquiry, pairing, audio routing, third-party packages or persisted device inventory.
export const BLUETOOTH_PROBE = String.raw`
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
try {
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class LezionifyBluetooth {
 [StructLayout(LayoutKind.Sequential)] public struct Search {
  public UInt32 size;
  [MarshalAs(UnmanagedType.Bool)] public bool authenticated;
  [MarshalAs(UnmanagedType.Bool)] public bool remembered;
  [MarshalAs(UnmanagedType.Bool)] public bool unknown;
  [MarshalAs(UnmanagedType.Bool)] public bool connected;
  [MarshalAs(UnmanagedType.Bool)] public bool inquiry;
  public byte timeout; public IntPtr radio;
 }
 [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct Device {
  public UInt32 size; public UInt64 address; public UInt32 deviceClass;
  [MarshalAs(UnmanagedType.Bool)] public bool connected;
  [MarshalAs(UnmanagedType.Bool)] public bool remembered;
  [MarshalAs(UnmanagedType.Bool)] public bool authenticated;
  public SystemTime lastSeen; public SystemTime lastUsed;
  [MarshalAs(UnmanagedType.ByValTStr, SizeConst=248)] public string name;
 }
 [StructLayout(LayoutKind.Sequential)] public struct SystemTime { public ushort year, month, weekday, day, hour, minute, second, milliseconds; }
 [DllImport("bthprops.cpl", SetLastError=true)] static extern IntPtr BluetoothFindFirstDevice(ref Search search, ref Device device);
 [DllImport("bthprops.cpl", SetLastError=true)] [return:MarshalAs(UnmanagedType.Bool)] static extern bool BluetoothFindNextDevice(IntPtr handle, ref Device device);
 [DllImport("bthprops.cpl")] [return:MarshalAs(UnmanagedType.Bool)] static extern bool BluetoothFindDeviceClose(IntPtr handle);
 public static string[] Connected() {
  var search = new Search { size=(UInt32)Marshal.SizeOf(typeof(Search)), connected=true };
  var device = new Device { size=(UInt32)Marshal.SizeOf(typeof(Device)) };
  var names = new List<string>();
  var handle = BluetoothFindFirstDevice(ref search, ref device);
  if (handle == IntPtr.Zero) {
   int error=Marshal.GetLastWin32Error();
   if (error != 0 && error != 259) throw new System.ComponentModel.Win32Exception(error);
   return names.ToArray();
  }
  try {
   do { if (device.connected && !String.IsNullOrWhiteSpace(device.name)) names.Add(device.name); }
   while (BluetoothFindNextDevice(handle, ref device));
   int error=Marshal.GetLastWin32Error();
   if (error != 0 && error != 259) throw new System.ComponentModel.Win32Exception(error);
  } finally { BluetoothFindDeviceClose(handle); }
  return names.ToArray();
 }
}
'@
while ($true) {
 try { $names = @([LezionifyBluetooth]::Connected()); ConvertTo-Json -Compress -InputObject @{names=$names} }
 catch { '{"unavailable":true}' }
 Start-Sleep -Seconds 3
}
} catch { '{"unavailable":true}' }
`
