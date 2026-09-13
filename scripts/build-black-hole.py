"""Build the homepage asset from the downloaded NestaEric model.
Run: Blender --background --python scripts/build-black-hole.py -- /path/to/black_hole
The original procedural approximation has been replaced by the supplied asset.
"""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name('prepare-black-hole.py')), run_name='__main__')
