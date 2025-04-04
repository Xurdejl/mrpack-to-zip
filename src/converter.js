import JSZip from 'jszip'
import { saveAs } from 'file-saver'

const mrApiBase = "https://api.modrinth.com/v2/"
const mrApiProject = mrApiBase + "project/"

function findMrpackFile(files) {
  return files.find(f => f.filename.endsWith('.mrpack') && f.primary);
}

export async function downloadFromModrinthUrl(modrinthUrl, onProgress) {
  const urlParts = modrinthUrl.match(/modrinth\.com\/(?:modpack|project)\/([^\/]+)(?:\/version\/([^\/]+))?/)
  if (!urlParts) {
    throw new Error("Invalid Modrinth URL format. Please use a project or version page URL.")
  }

  const projectIdOrSlug = urlParts[1]
  const versionIdOrSlug = urlParts[2]

  try {
    let versionData;
    if (versionIdOrSlug) {
      const versionResponse = await fetch(`${mrApiProject}${projectIdOrSlug}/version/${versionIdOrSlug}`)
      if (!versionResponse.ok) {
        throw new Error(`Could not fetch version ${versionIdOrSlug} for project ${projectIdOrSlug}. Status: ${versionResponse.status}`)
      }
      versionData = await versionResponse.json()
      
      if (!versionData || !versionData.files) {
        throw new Error(`Version ${versionIdOrSlug} for project ${projectIdOrSlug} not found or has no files.`)
      }
    } else {
      const versionsResponse = await fetch(`${mrApiProject}${projectIdOrSlug}/version`)
      if (!versionsResponse.ok) {
        throw new Error(`Could not fetch versions for project ${projectIdOrSlug}. Status: ${versionsResponse.status}`)
      }
      const versions = await versionsResponse.json()
      if (!versions || !versions.length) {
        throw new Error(`No versions found for project ${projectIdOrSlug}.`)
      }
      versionData = versions[0]
      if (!versionData || !versionData.files) {
        throw new Error(`Latest version for project ${projectIdOrSlug} has no files.`)
      }
    }

    const mrpackFile = findMrpackFile(versionData.files);
    if (!mrpackFile || !mrpackFile.url) {
      throw new Error("Could not find a primary .mrpack file for this version.")
    }

    const result = await downloadFromUrlInternal(mrpackFile.url, onProgress)
    return {
      content: result.content,
      filename: `${versionData.name || projectIdOrSlug}-${versionData.version_number || ''}.zip`
    }
  } catch (error) {
    console.error('Error processing Modrinth URL:', error)
    throw error
  }
}

async function downloadFromUrlInternal(url, onProgress) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error(`Invalid download URL provided: ${url}`);
  }

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download file from ${url}. Status: ${response.status}`);
    }
    const data = await response.blob()
    if (!data.type.includes('zip')) {
      console.warn(`Downloaded file from ${url} has unexpected type: ${data.type}. Attempting to process anyway.`);
    }
    return await processMrpack(data, onProgress)
  } catch (error) {
    console.error('Error downloading from URL:', error)
    throw error
  }
}

export async function processMrpack(data, onProgress) {
  if (!data || data.size === 0) {
    throw new Error("Invalid or empty file data")
  }

  const newZip = new JSZip()
  let zip;
  try {
    zip = await JSZip.loadAsync(data)
  } catch (e) {
    console.error("Failed to load mrpack file:", e);
    throw new Error("Failed to read the provided file. Is it a valid .mrpack file?");
  }

  const manifestFile = zip.file('modrinth.index.json');
  if (!manifestFile) {
    throw new Error("Missing 'modrinth.index.json' in the mrpack file.");
  }
  const manifest = JSON.parse(await manifestFile.async('string'))

  if (!manifest.files || !manifest.formatVersion || !manifest.game || !manifest.versionId || !manifest.name || !manifest.dependencies) {
    console.warn("Manifest might be missing some standard fields.");
  }

  const overridePromises = []
  const overrideFolders = ["overrides/", "client-overrides/"];

  for (const fileName in zip.files) {
    const file = zip.files[fileName]
    if (file.dir) continue

    const overridePrefix = overrideFolders.find(folder => file.name.startsWith(folder));
    if (overridePrefix) {
      const properFileName = file.name.substring(overridePrefix.length);
      if (properFileName) {
        overridePromises.push(
          file.async('blob').then(blob => newZip.file(properFileName, blob))
        );
      }
    }
  }

  await Promise.all(overridePromises);

  let totalFileSize = 0
  let downloaded = 0

  manifest.files.forEach(file => {
    totalFileSize += file.fileSize
  })

  const filePromises = manifest.files.map(async (file) => {
    if (!file.path || !file.downloads || !file.downloads.length || !file.downloads[0] || !file.fileSize) {
      console.warn(`Skipping file due to missing data: ${JSON.stringify(file)}`);
      return;
    }

    if (file.downloads[0].includes("github.com") || file.downloads[0].includes("raw.githubusercontent.com") || !file.downloads[0].startsWith("https://cdn.modrinth.com/")) {
      console.log(`Opening external download URL: ${file.downloads[0]}`);
      window.open(file.downloads[0], '_blank');
      alert(`A file (${file.path}) needs to be downloaded manually from an external source: ${file.downloads[0]}. Please place it in the correct 'mods' or relevant folder inside the final zip.`);
      totalFileSize -= file.fileSize;
      return;
    }

    try {
      const response = await fetch(file.downloads[0])
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob()
      if (blob.size !== file.fileSize) {
        console.warn(`Downloaded size (${blob.size}) for ${file.path} does not match manifest size (${file.fileSize}).`);
      }
      downloaded += file.fileSize
      onProgress(totalFileSize > 0 ? Math.round((downloaded / totalFileSize) * 100) : 0);
      return newZip.file(file.path, blob)
    } catch (error) {
      console.warn(`Failed to download ${file.path} from ${file.downloads[0]}:`, error)
      totalFileSize -= file.fileSize;
      onProgress(totalFileSize > 0 ? Math.round((downloaded / totalFileSize) * 100) : 0);
    }
  })

  await Promise.all(filePromises)

  const content = await newZip.generateAsync({ type: "blob" })
  const defaultFilename = data.name || 'modpack.zip';
  
  return {
    content,
    filename: manifest.name ? `${manifest.name}-${manifest.versionId}.zip` : defaultFilename
  }
}

export function downloadZip(content, filename) {
  saveAs(content, filename)
} 