import { describe, it, expect } from 'vitest';
import { File } from '../../models/file';

describe('File Model', () => {
  describe('Constructor', () => {
    it('should create file with all fields', () => {
      const file = new File({ extension: 'pdf', name: 'test.pdf', path: '/files/test.pdf' });
      expect(file.Extension).toBe('pdf');
      expect(file.Name).toBe('test.pdf');
      expect(file.Path).toBe('/files/test.pdf');
    });

    it('should handle NC file extension', () => {
      const file = new File({ extension: 'nc', name: 'program.nc', path: '/files/program.nc' });
      expect(file.Extension).toBe('nc');
    });

    it('should handle uppercase extension', () => {
      const file = new File({ extension: 'PDF', name: 'test.PDF', path: '/files/test.PDF' });
      expect(file.Extension).toBe('PDF');
    });

    it('should handle G-code extensions', () => {
      const gcode = new File({ extension: 'gcode', name: 'part.gcode', path: '/files/part.gcode' });
      expect(gcode.Extension).toBe('gcode');

      const ngc = new File({ extension: 'ngc', name: 'part.ngc', path: '/files/part.ngc' });
      expect(ngc.Extension).toBe('ngc');

      const tap = new File({ extension: 'tap', name: 'part.tap', path: '/files/part.tap' });
      expect(tap.Extension).toBe('tap');
    });
  });

  describe('Getters and Setters', () => {
    it('should set and get Extension', () => {
      const file = new File({ extension: 'pdf', name: 'test.pdf', path: '/test.pdf' });
      file.Extension = 'docx';
      expect(file.Extension).toBe('docx');
    });

    it('should set and get Name', () => {
      const file = new File({ extension: 'pdf', name: 'test.pdf', path: '/test.pdf' });
      file.Name = 'renamed.pdf';
      expect(file.Name).toBe('renamed.pdf');
    });

    it('should set and get Path', () => {
      const file = new File({ extension: 'pdf', name: 'test.pdf', path: '/test.pdf' });
      file.Path = '/new/path/test.pdf';
      expect(file.Path).toBe('/new/path/test.pdf');
    });
  });

  describe('toString', () => {
    it('should serialize to JSON string', () => {
      const file = new File({ extension: 'pdf', name: 'test.pdf', path: '/files/test.pdf' });
      const str = file.toString();
      const parsed = JSON.parse(str);
      expect(parsed.extension).toBe('pdf');
      expect(parsed.name).toBe('test.pdf');
      expect(parsed.path).toBe('/files/test.pdf');
    });

    it('should be parseable back from JSON', () => {
      const file = new File({ extension: 'nc', name: 'program.nc', path: '/files/program.nc' });
      const str = file.toString();
      const parsed = JSON.parse(str);
      const restored = new File(parsed);
      expect(restored.Extension).toBe('nc');
      expect(restored.Name).toBe('program.nc');
      expect(restored.Path).toBe('/files/program.nc');
    });
  });
});
